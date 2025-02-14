import { 
  ENRICHED_GOAL_SYS_MSG,
  ENRICHED_GOAL_USR_MSG,
  GOAL_TO_TASK_SYS_MSG,
  GOAL_TO_TASK_USR_MSG 
} from './prompts';
import { PreGoal, Goal, Milestone, Task, GoalPlan } from '@/app/types/goal';

import OpenAI from 'openai';
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { db } from '@/db/configFirebase';
import { doc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, you should use a backend to make these calls
});

// Zod schemas matching our interfaces
const TaskSchema = z.object({
  name: z.string(),
  order: z.number(),
  description: z.string().optional(),
  duration_hours: z.number(),
  deadline: z.string(),
  simplicity: z.number(),
  importance: z.number(),
  urgency: z.number(),
  completed: z.boolean(),
  guid: z.string(),
  muid: z.string()
});

const MilestoneSchema = z.object({
  muid: z.string(),
  name: z.string(),
  order: z.number(),
  description: z.string().optional(),
  tasks: z.array(TaskSchema),
  deadline: z.string().optional(),
  guid: z.string()
});

const GoalSchema = z.object({
  guid: z.string(),
  name: z.string(),
  description: z.string().optional(),
  deadline: z.string(),
  progress: z.number(),
  milestones: z.array(MilestoneSchema)
});

const GoalPlanSchema = z.object({
  goal: GoalSchema,
  markdown: z.string()
});

/**
 * Calls OpenAI API to generate a smart goal based on the provided pre-goal input.
 *
 * @param preGoal The pre-goal input containing details about what, why, when, and profile.
 * @returns A promise that resolves to the generated smart goal string.
 */
export async function smartGoal(preGoal: PreGoal): Promise<string> {
  const enrichedGoalUserMessage = ENRICHED_GOAL_USR_MSG
    .replace("$WHAT", preGoal.what)
    .replace("$WHY", preGoal.why)
    .replace("$WHEN", preGoal.when)
    .replace("$PROFILE", JSON.stringify(preGoal.profile));

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: ENRICHED_GOAL_SYS_MSG },
      { role: "user", content: enrichedGoalUserMessage }
    ]
  });

  if (!completion.choices[0]?.message?.content) {
    throw new Error("Failed to generate smart goal.");
  }

  return completion.choices[0].message.content;
}

/**
 * Calls OpenAI API to generate milestones and tasks based on a validated smart goal.
 *
 * @param validatedSmartGoal The validated smart goal as a string.
 * @returns A promise that resolves to the generated goal plan, including milestones and tasks.
 */
export async function generateMilestonesAndTasks(
  validatedSmartGoal: string
): Promise<Goal> {
  const goalToTaskUserMessage = GOAL_TO_TASK_USR_MSG
    .replace("$SMART_GOAL", validatedSmartGoal)
    .replace("$CURRENT_DATE", new Date().toISOString());

  let completion;
  try {
    completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06", 
      messages: [
        { role: "system", content: GOAL_TO_TASK_SYS_MSG },
        { role: "user", content: goalToTaskUserMessage }
      ],
      response_format: zodResponseFormat(GoalPlanSchema, 'goalPlan')
    });

    const goalPlan = completion.choices[0].message.parsed;
    if (!goalPlan) {
      throw new Error("Failed to parse goal plan");
    }
    
    goalPlan.goal.guid = uuidv4();
    goalPlan.goal.milestones = goalPlan.goal.milestones.map(milestone => {
      const muid = uuidv4();
      return {
        ...milestone,
        muid,
        guid: uuidv4(),
        tasks: milestone.tasks.map(task => ({
          ...task,
          guid: uuidv4(),
          muid
        }))
      };
    });
    
    // Save to Firebase
    const goalPath = `plans/${goalPlan.goal.guid}`;
    await setDoc(doc(db, goalPath), goalPlan);

    return goalPlan.goal;
  } catch (error) {
    console.error("Failed to generate or validate goal plan:", error);
    throw new Error("Failed to generate valid goal plan structure");
  }
}

/**
 * Extracts deadline date from the SMART goal text
 */
function extractDeadlineFromSmartGoal(smartGoal: string): string {
  const dateMatch = smartGoal.match(/by\s+([\w\s,]+\d{4})|within\s+(\d+)\s+(days|weeks|months)/i);
  if (dateMatch) {
    if (dateMatch[1]) {
      return new Date(dateMatch[1]).toISOString();
    } else {
      const amount = parseInt(dateMatch[2]);
      const unit = dateMatch[3];
      const date = new Date();
      switch (unit) {
        case 'days':
          date.setDate(date.getDate() + amount);
          break;
        case 'weeks':
          date.setDate(date.getDate() + (amount * 7));
          break;
        case 'months':
          date.setMonth(date.getMonth() + amount);
          break;
      }
      return date.toISOString();
    }
  }
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  return date.toISOString();
}