import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { followUpEmailAgent } from "../agents/follow-up-email-agent";
import {
  findLatestPastWorkshopForFollowUpEmail,
  findNextUpcomingWorkshopForFollowUpEmail,
} from "../lib/sanity/workshops";

const WORKSHOPS_SLIDES_URL = "https://github.com/mastra-ai/workshops";
const MASTRA_X_URL = "https://x.com/mastra";
const BOOKER_X_URL = "https://x.com/bookercodes";

const generateFollowUpEmailInputSchema = z.object({});

const emailWorkshopSchema = z.object({
  docId: z.string(),
  title: z.string(),
  eventDate: z.string(),
  lumaUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
});

const followUpContextSchema = z.object({
  latestWorkshop: emailWorkshopSchema.nullable(),
  nextWorkshop: emailWorkshopSchema.nullable(),
});

const generateFollowUpEmailOutputSchema = z.object({
  text: z.string(),
});

const followUpPromptSchema = z.object({
  prompt: z.string(),
});

function toEmailWorkshop(
  workshop:
    | {
        _id: string;
        title: string;
        eventDate: string;
        lumaUrl?: string;
        youtubeUrl?: string;
      }
    | undefined,
): z.infer<typeof emailWorkshopSchema> | null {
  if (!workshop) {
    return null;
  }

  return {
    docId: workshop._id,
    title: workshop.title,
    eventDate: workshop.eventDate,
    ...(workshop.lumaUrl && { lumaUrl: workshop.lumaUrl }),
    ...(workshop.youtubeUrl && { youtubeUrl: workshop.youtubeUrl }),
  };
}

function formatEventDay(eventDate: string): string {
  const date = new Date(eventDate);
  if (!Number.isFinite(date.getTime())) {
    return "Next Thursday";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Europe/London",
  }).format(date);
}

function buildFollowUpPrompt(
  input: z.infer<typeof followUpContextSchema>,
): string {
  const latest = input.latestWorkshop;
  if (!latest) {
    return [
      "No past workshop was found.",
      "Return this exact text:",
      "No past workshop was found, so there is no follow-up email to generate yet.",
    ].join("\n");
  }

  const recordingUrl = latest.youtubeUrl || latest.lumaUrl || "RECORDING_URL";
  const next = input.nextWorkshop;
  return [
    "Write the follow-up email copy.",
    "",
    "Use this data:",
    `- Latest workshop title: ${latest.title}`,
    `- Recording URL: ${recordingUrl}`,
    `- Slides URL: ${WORKSHOPS_SLIDES_URL}`,
    next
      ? `- Next workshop: ${next.title} on ${formatEventDay(next.eventDate)}${next.lumaUrl ? ` at ${next.lumaUrl}` : ""}`
      : "- Next workshop: none scheduled yet",
    `- Mastra X URL: ${MASTRA_X_URL}`,
    `- Alex Booker X URL: ${BOOKER_X_URL}`,
    "",
    "Write exactly one Markdown message. Keep it natural and copy-ready for Luma.",
    "Every link must be both bold and inline, like **[recording](https://example.com)**.",
    'Use contractions. Never write "you will"; write "you\'ll".',
  ].join("\n");
}

const findFollowUpEmailContextStep = createStep({
  id: "find-follow-up-email-context",
  description: "Find the latest past workshop and the next upcoming workshop.",
  inputSchema: generateFollowUpEmailInputSchema,
  outputSchema: followUpContextSchema,
  execute: async () => {
    const [latestWorkshop, nextWorkshop] = await Promise.all([
      findLatestPastWorkshopForFollowUpEmail(),
      findNextUpcomingWorkshopForFollowUpEmail(),
    ]);

    return {
      latestWorkshop: toEmailWorkshop(latestWorkshop),
      nextWorkshop: toEmailWorkshop(nextWorkshop),
    };
  },
});

const prepareFollowUpEmailPromptStep = createStep({
  id: "prepare-follow-up-email-prompt",
  description: "Prepare the writing prompt for the follow-up email agent.",
  inputSchema: followUpContextSchema,
  outputSchema: followUpPromptSchema,
  execute: async ({ inputData }) => ({
    prompt: buildFollowUpPrompt(inputData),
  }),
});

const writeFollowUpEmailStep = createStep(followUpEmailAgent, {
  structuredOutput: { schema: generateFollowUpEmailOutputSchema },
});

function normalizeLumaEmailFormatting(text: string): string {
  return text
    .replace(/\byou will\b/gi, "you'll")
    .replace(/(?<!\*)\[([^\]]+)\]\(([^)]+)\)(?!\*)/g, "**[$1]($2)**")
    .trim();
}

const normalizeFollowUpEmailFormattingStep = createStep({
  id: "normalize-follow-up-email-formatting",
  description:
    "Ensure the final Luma email copy uses bold Markdown links and requested contractions.",
  inputSchema: generateFollowUpEmailOutputSchema,
  outputSchema: generateFollowUpEmailOutputSchema,
  execute: async ({ inputData }) => ({
    text: normalizeLumaEmailFormatting(inputData.text),
  }),
});

export const generateFollowUpEmailWorkflow = createWorkflow({
  id: "generate-follow-up-email",
  inputSchema: generateFollowUpEmailInputSchema,
  description: "bar foo",
  outputSchema: generateFollowUpEmailOutputSchema,
})
  .then(findFollowUpEmailContextStep)
  .then(prepareFollowUpEmailPromptStep)
  .then(writeFollowUpEmailStep)
  .then(normalizeFollowUpEmailFormattingStep)
  .commit();
