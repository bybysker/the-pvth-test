"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { GoalPlan } from "@/app/types/goal"
import { doc, getDoc, collection, addDoc } from "firebase/firestore"
import { db } from "@/db/configFirebase"
import { cn } from "@/lib/utils"
import axios from "axios"
import OpenAI from "openai"
import { smartGoal as generateSmartGoal, generateMilestonesAndTasks } from "./goal-to-tasks"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, you should use a backend
})

export function GoalForm() {
  const [formData, setFormData] = useState({
    what: "",
    why: "",
    when: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [goalPlan, setGoalPlan] = useState<GoalPlan | null>(null)
  const [smartGoal, setSmartGoal] = useState("")
  const [editableSmartGoal, setEditableSmartGoal] = useState("")
  const [showSmartGoalValidation, setShowSmartGoalValidation] = useState(false)
  const [isEditingSmartGoal, setIsEditingSmartGoal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generationStep, setGenerationStep] = useState<'initial' | 'smart' | 'milestones' | 'complete'>('initial')
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  
  // -- Feedback State Variables --
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")

  const generateMarkdown = (goalPlan: GoalPlan) => {
    const { goal } = goalPlan;
    let markdown = `# ${goal.name}\n\n`;
    markdown += `## Description\n${goal.description || 'No description provided'}\n\n`;
    markdown += `**Target Date:** ${new Date(goal.deadline).toLocaleDateString()}\n`;

    markdown += `## Milestones\n\n`;
    goal.milestones.forEach((milestone, index) => {
      markdown += `### ${index + 1}. ${milestone.name}\n\n`;
      markdown += `${milestone.description || 'No description provided'}\n\n`;
      markdown += `#### Tasks\n\n`;
      milestone.tasks.forEach((task, taskIndex) => {
        markdown += `${taskIndex + 1}. **${task.name}**\n`;
        if (task.description) {
          markdown += `   - ${task.description}\n`;
        }
      });
    });

    return markdown;
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {}
    const today = new Date()
    const targetDate = new Date(formData.when)

    if (formData.what.length < 10) {
      errors.what = "Goal description should be at least 10 characters"
    }
    if (formData.why.length < 20) {
      errors.why = "Motivation should be at least 20 characters"
    }
    if (targetDate <= today) {
      errors.when = "Target date must be in the future"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setGenerationStep('smart')

    try {
      const smartGoalResult = await generateSmartGoal({
        what: formData.what,
        why: formData.why,
        when: formData.when,
        profile: {} // Add profile data if needed
      });

      setSmartGoal(smartGoalResult)
      setEditableSmartGoal(smartGoalResult)
      setShowSmartGoalValidation(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      setGenerationStep('initial')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSmartGoalValidation = async (isValid: boolean) => {
    if (!isValid) {
      setIsEditingSmartGoal(true)
      return
    }

    setIsLoading(true)
    setGenerationStep('milestones')
    setError(null)

    try {
      const goalPlanData = await generateMilestonesAndTasks(
        isEditingSmartGoal ? editableSmartGoal : smartGoal
      );
      
      const goalPlan = { goal: goalPlanData, markdown: "" }
      const markdown = generateMarkdown(goalPlan)
      setGoalPlan({ goal: goalPlanData, markdown })
      setShowSmartGoalValidation(false)
      setShowDialog(true)
      setIsEditingSmartGoal(false)
      setGenerationStep('complete')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      setGenerationStep('smart')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadMarkdown = (format: "md" | "txt") => {
    if (!goalPlan) return;
    
    const content = format === "md" ? goalPlan.markdown : goalPlan.markdown.replace(/[#*`]/g, "").replace(/\n\n/g, "\n")
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `my-goal-plan.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-blue-900/40 to-blue-950/60 backdrop-blur-sm p-8 shadow-2xl border-blue-400/30 rounded-xl transition-all duration-300 hover:shadow-blue-500/10 hover:border-blue-400/40">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <Label htmlFor="goal" className="text-blue-100 font-medium text-lg tracking-wide">
              What's your goal?
            </Label>
            <Input
              id="goal"
              placeholder="e.g., Learn to play the guitar"
              className={cn(
                "bg-blue-950/50 border-blue-400/30 text-white placeholder:text-blue-300/70 h-12 text-lg shadow-inner rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 hover:border-blue-400/40",
                validationErrors.what && "border-red-500/50 focus:ring-red-500/50"
              )}
              value={formData.what}
              onChange={(e) => {
                setFormData({ ...formData, what: e.target.value })
                setValidationErrors({ ...validationErrors, what: "" })
              }}
              required
            />
            {validationErrors.what && (
              <p className="text-red-300 text-sm mt-1">{validationErrors.what}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="why" className="text-blue-100 font-medium text-lg tracking-wide">
              Why is this important to you?
            </Label>
            <Textarea
              id="why"
              placeholder="Describe your motivation and the impact this will have"
              className={cn(
                "bg-blue-950/50 border-blue-400/30 text-white placeholder:text-blue-300/70 min-h-[120px] text-lg shadow-inner rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 hover:border-blue-400/40",
                validationErrors.why && "border-red-500/50 focus:ring-red-500/50"
              )}
              value={formData.why}
              onChange={(e) => {
                setFormData({ ...formData, why: e.target.value })
                setValidationErrors({ ...validationErrors, why: "" })
              }}
              required
            />
            {validationErrors.why && (
              <p className="text-red-300 text-sm mt-1">{validationErrors.why}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="when" className="text-blue-100 font-medium text-lg tracking-wide">
              Target completion date
            </Label>
            <Input
              id="when"
              type="date"
              className={cn(
                "bg-blue-950/50 border-blue-400/30 text-white h-12 text-lg shadow-inner rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 hover:border-blue-400/40",
                validationErrors.when && "border-red-500/50 focus:ring-red-500/50"
              )}
              value={formData.when}
              onChange={(e) => {
                setFormData({ ...formData, when: e.target.value })
                setValidationErrors({ ...validationErrors, when: "" })
              }}
              required
            />
            {validationErrors.when && (
              <p className="text-red-300 text-sm mt-1">{validationErrors.when}</p>
            )}
          </div>

          <div className="space-y-4">
            {generationStep !== 'initial' && (
              <div className="w-full bg-blue-900/30 rounded-full h-2 mb-4">
                <div 
                  className="bg-blue-400 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: generationStep === 'smart' ? '50%' : 
                           generationStep === 'milestones' ? '75%' : 
                           generationStep === 'complete' ? '100%' : '0%' 
                  }}
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-100 to-white text-blue-900 hover:from-white hover:to-blue-50 font-semibold text-lg py-6 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 rounded-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {generationStep === 'smart' ? 'Creating SMART goal...' :
                   generationStep === 'milestones' ? 'Generating milestones...' :
                   'Processing...'}
                </>
              ) : (
                "Get my plan"
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* SMART Goal Validation Dialog */}
      <Dialog open={showSmartGoalValidation} onOpenChange={setShowSmartGoalValidation}>
        <DialogContent className="max-w-sm rounded-lg bg-gradient-to-b from-blue-950 to-blue-900 border border-blue-400/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-100">Validate Your SMART Goal</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-[300px] overflow-y-auto">
            <p className="text-md text-center text-blue-200 mb-4">
              We've transformed your goal into a SMART goal. Please review and validate it:
            </p>
            {isEditingSmartGoal ? (
              <Textarea
                value={editableSmartGoal}
                onChange={(e) => setEditableSmartGoal(e.target.value)}
                className="w-full min-h-[150px] p-4 bg-blue-900/50 rounded-lg text-blue-100 border border-blue-400/30 shadow-inner transition-all duration-200 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50"
                placeholder="Edit your SMART goal here..."
              />
            ) : (
              <div className="p-6 bg-blue-900/50 rounded-lg border border-blue-400/30 shadow-inner">
                <p className="text-blue-100 text-md leading-relaxed">{smartGoal}</p>
              </div>
            )}
          </div>
          <DialogFooter className="space-x-3 items-center">
            {isEditingSmartGoal ? (
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditableSmartGoal(smartGoal)
                    setIsEditingSmartGoal(false)
                  }}
                  disabled={isLoading}
                  className="flex-1 py-3 border-blue-400/50 text-blue-900 hover:bg-blue-200 transition-colors duration-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setSmartGoal(editableSmartGoal)
                    setIsEditingSmartGoal(false)
                    handleSmartGoalValidation(true)
                  }}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-blue-100 text-blue-900 hover:bg-blue-200 transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : "Save Changes & Generate Plan"}
                </Button>
              </div>
            ) : (
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleSmartGoalValidation(false)}
                  disabled={isLoading}
                  className="flex-1 py-3 border-blue-400/50 text-blue-900 hover:bg-blue-200 transition-colors duration-200"
                >
                  Edit Goal
                </Button>
                <Button
                  onClick={() => handleSmartGoalValidation(true)}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-blue-100 text-blue-900 hover:bg-blue-200 transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating Plan...
                    </>
                  ) : "Confirm & Generate Plan"}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Plan Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gradient-to-b from-blue-950 to-blue-900 border border-blue-400/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-blue-100 border-b border-blue-400/30 pb-4">Your Goal Plan</DialogTitle>
          </DialogHeader>
          <div className="prose prose-lg dark:prose-invert max-w-none py-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-12">
                <Loader2 className="h-12 w-12 animate-spin text-blue-100" />
                <p className="text-blue-100 text-lg animate-pulse">Generating your personalized goal plan...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-900/50 rounded-xl w-[80%] p-8 backdrop-blur-sm shadow-2xl border border-blue-400/20">
                  {goalPlan && (
                    <ReactMarkdown 
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-base sm:text-lg md:text-xl text-center font-bold mb-4 sm:mb-6 text-blue-50 border-b border-blue-400/30 pb-2 sm:pb-3 tracking-wide" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4 text-blue-100 tracking-wide" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-xs sm:text-md font-medium mb-2 sm:mb-3 text-blue-200 tracking-wide" {...props} />,
                        h4: ({node, ...props}) => <h4 className="text-xs sm:text-sm font-medium mb-2 text-blue-300 tracking-wide" {...props} />,
                        p: ({node, ...props}) => <p className="text-xs sm:text-sm mb-3 sm:mb-4 text-blue-50/90 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 sm:pl-6 mb-3 sm:mb-4 text-blue-50/90 space-y-1 sm:space-y-2 text-xs sm:text-sm" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 sm:pl-6 mb-3 sm:mb-4 text-blue-50/90 space-y-1 sm:space-y-2 text-xs sm:text-sm" {...props} />,
                        li: ({node, ...props}) => <li className="mb-1 sm:mb-2 text-xs sm:text-sm" {...props} />,
                        strong: ({node, ...props}) => <strong className="text-blue-100 font-semibold" {...props} />,
                      }}
                    >
                      {goalPlan.markdown}
                    </ReactMarkdown>
                  )}
                </div>
                {goalPlan && (
                  <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-400/20">
                    <p className="text-blue-100 mb-3">Download your goal plan:</p>
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => downloadMarkdown("txt")}
                        className="flex-1 border-blue-400/30 text-blue-100 hover:bg-blue-800/50 transition-colors duration-200"
                      >
                        <span className="mr-2">📄</span>
                        Download as TXT
                      </Button>
                      <Button 
                        onClick={() => downloadMarkdown("md")}
                        className="flex-1 bg-gradient-to-r from-blue-100 to-white text-blue-900 hover:from-white hover:to-blue-50 transition-all duration-200"
                      >
                        <span className="mr-2">📝</span>
                        Download as Markdown
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Feedback Button */}
      <Button 
        variant="outline"
        className="fixed bottom-4 right-4 z-50 bg-blue-100 text-blue-900 hover:bg-blue-200 transition-colors duration-200 px-4 py-2 rounded-full shadow-lg"
        onClick={() => setShowFeedback(true)}
      >
        Feedback
      </Button>

      {/* Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="max-w-sm rounded-lg bg-gradient-to-b from-blue-950 to-blue-900 border border-blue-400/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-100">We value your feedback</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us what you think about our site..."
              className="w-full min-h-[100px] p-4 bg-blue-900/50 rounded-lg text-blue-100 border border-blue-400/30 shadow-inner transition-all duration-200 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50"
            />
          </div>
          <DialogFooter className="space-x-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setFeedbackText("")
                setShowFeedback(false)
              }}
              className="py-3 border-blue-400/50 text-blue-900 hover:bg-blue-200 transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                try {
                  // Save the feedback to Firebase Firestore under the "feedback" collection
                  console.log("Saving feedback to", collection(db, "feedback"))
                  await addDoc(collection(db, "feedbacks"), {
                    text: feedbackText,
                    createdAt: new Date(), // Record the current timestamp
                  })
                  console.log("Feedback saved to Firebase successfully:", feedbackText)
                } catch (error) {
                  console.error("Error saving feedback to Firebase:", error)
                }
                // Clear the feedback input and close the dialog
                setFeedbackText("")
                setShowFeedback(false)
              }}
              className="py-3 bg-blue-100 text-blue-900 hover:bg-blue-200 transition-all duration-200"
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

