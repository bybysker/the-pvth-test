"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { GoalPlan } from "@/app/types/goal"
import { doc, getDoc, collection, addDoc } from "firebase/firestore"
import { db } from "@/db/configFirebase"
import { cn } from "@/lib/utils"
import axios from "axios"
import OpenAI from "openai"
import { smartGoal as generateSmartGoal, generateMilestonesAndTasks } from "./goal-to-tasks"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, you should use a backend
})

export function GoalForm() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    what: "",
    why: "",
    when: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
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

  // Add new state for onboarding
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)

  const [hasLastGoal, setHasLastGoal] = useState(false)

  const generateMarkdown = (goalPlan: GoalPlan) => {
    const { goal } = goalPlan;
    let markdown = `# ${goal.name}\n\n`;
    markdown += `## Description\n${goal.description || 'No description provided'}\n\n`;
    markdown += `**Target Date:** ${new Date(goal.deadline).toLocaleDateString()}\n`;

    markdown += `## Goal Plan \n\n`;
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
    setShowDrawer(true)

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

  // Add local storage functions
  const saveGoalToLocalStorage = (goalData: GoalPlan) => {
    try {
      localStorage.setItem('lastGoal', JSON.stringify({
        goalPlan: goalData,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  };

  const loadLastGoal = () => {
    try {
      const savedGoal = localStorage.getItem('lastGoal');
      if (savedGoal) {
        const { goalPlan: lastGoal, timestamp } = JSON.parse(savedGoal);
        return { lastGoal, timestamp };
      }
    } catch (error) {
      console.error('Error loading from local storage:', error);
    }
    return null;
  };

  // Add function to check and load last goal
  const checkLastGoal = () => {
    const savedGoal = localStorage.getItem('lastGoal');
    if (savedGoal) {
      setHasLastGoal(true);
      return true;
    }
    return false;
  };

  // Add function to view last goal
  const viewLastGoal = () => {
    const savedGoalData = loadLastGoal();
    if (savedGoalData) {
      const { lastGoal } = savedGoalData;
      setGoalPlan(lastGoal);
      setShowDrawer(true);
      setGenerationStep('complete');
    }
  };

  // Modify useEffect to check for last goal on mount
  useEffect(() => {
    checkLastGoal();
  }, []);

  const handleSmartGoalValidation = async (isValid: boolean) => {
    if (!isValid) {
      setIsEditingSmartGoal(true)
      return
    }

    setIsLoading(true)
    setGenerationStep('milestones')
    setIsEditingSmartGoal(false)
    setShowSmartGoalValidation(false)
    setShowOnboarding(true)
    setError(null)

    try {
      const goalPlanData = await generateMilestonesAndTasks(
        isEditingSmartGoal ? editableSmartGoal : smartGoal
      );
      
      const goalPlan = { goal: goalPlanData, markdown: "" }
      const markdown = generateMarkdown(goalPlan)
      const finalGoalPlan = { goal: goalPlanData, markdown };
      
      setGoalPlan(finalGoalPlan)
      saveGoalToLocalStorage(finalGoalPlan);
      setHasLastGoal(true);  // Update hasLastGoal when new plan is generated
      setGenerationStep('complete')
      setShowOnboarding(false)
      
      toast({
        title: "Goal Plan Generated!",
        description: "Your personalized goal plan is ready and saved for future reference.",
        duration: 5000,
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      setGenerationStep('smart')
      setShowOnboarding(false)
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

  // Add the feedback submission handler
  const handleFeedbackSubmit = async () => {
    try {
      await addDoc(collection(db, "feedbacks"), {
        text: feedbackText,
        createdAt: new Date(),
      })
      setFeedbackText("")
      setShowFeedback(false)
      toast({
        title: "Thank you for your feedback!",
        description: "We appreciate your input and will use it to improve our service.",
        duration: 3000,
      })
    } catch (error) {
      console.error("Error saving feedback:", error)
      toast({
        title: "Error submitting feedback",
        description: "Please try again later.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Add onboarding steps content
  const onboardingSteps = [
    {
      title: "Welcome to Your Goal Plan!",
      description: "We've created a detailed roadmap to help you achieve your goal. Let's walk through how to use it effectively.",
    },
    {
      title: "Understanding Your Plan",
      description: "Your plan is broken down into milestones and specific tasks. Each milestone represents a key achievement on your journey.",
    },
    {
      title: "Track Your Progress",
      description: "Download your plan in either Markdown or TXT format to track your progress and keep it handy.",
    },
    {
      title: "Share Your Experience",
      description: "Your feedback helps us improve! Consider sharing your experience with our goal planning tool.",
    }
  ]

  // Add useEffect for auto-sliding onboarding
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (showOnboarding && isLoading) {
      timer = setTimeout(() => {
        if (onboardingStep === onboardingSteps.length - 1) {
          setOnboardingStep(0);
        } else {
          setOnboardingStep(step => step + 1);
        }
      }, 5000);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [showOnboarding, onboardingStep, onboardingSteps.length, isLoading]);

  // Add circular progress animation component
  const CircularProgress = () => {
    return (
      <div className="absolute top-6 right-6">
        <svg className="w-6 h-6 -rotate-90">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-blue-400/30"
          />
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-blue-100"
            strokeDasharray="62.83"
            strokeDashoffset="0"
            style={{
              animation: "circle-progress 5s linear infinite",
            }}
          />
        </svg>
        <style jsx global>{`
          @keyframes circle-progress {
            from {
              stroke-dashoffset: 62.83;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      </div>
    );
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-blue-900/40 to-blue-950/60 backdrop-blur-sm p-8 shadow-2xl border-blue-400/30 rounded-xl transition-all duration-300 hover:shadow-blue-500/10 hover:border-blue-400/40">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">
            {error}
          </div>
        )}
        {hasLastGoal && (
          <div className="mb-6 flex justify-center">
            <Button
              variant="outline"
              onClick={viewLastGoal}
              className="w-full sm:w-auto bg-blue-900/50 text-blue-100 border-blue-400/30 hover:bg-blue-800/60 hover:border-blue-400/50 transition-all duration-200"
            >
              <span className="mr-2">📋</span>
              View Last Goal Plan
            </Button>
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

      {/* Goal Plan Drawer */}
      <Drawer open={showDrawer} onOpenChange={setShowDrawer}>
        <DrawerContent className="h-[95dvh] bg-gradient-to-b from-blue-950 to-blue-900 border-t border-blue-400/30">
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader className="relative">
              <DrawerTitle className="text-lg text-center font-bold text-blue-100 border-b border-blue-400/30 pb-4">
                {isLoading ? "Generating Your Goal Plan..." : "Your Goal Plan"}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4">
              <div className="mt-6">
                {isLoading ? (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center space-y-4 py-6">
                      <Loader2 className="h-12 w-12 animate-spin text-blue-100" />
                      <p className="text-blue-100 text-lg animate-pulse">
                        {generationStep === 'smart' ? 'Creating your SMART goal...' :
                         generationStep === 'milestones' ? 'Generating milestones and tasks...' :
                         'Processing your goal...'}
                      </p>
                    </div>
                    
                    {/* Onboarding during generation */}
                    {showOnboarding && (
                      <div className="bg-blue-900/50 rounded-xl p-6 backdrop-blur-sm shadow-xl border border-blue-400/20 relative">
                        <CircularProgress />
                        <h3 className="text-xl font-bold text-blue-100 mb-4">
                          {onboardingSteps[onboardingStep].title}
                        </h3>
                        <p className="text-blue-100 text-base leading-relaxed">
                          {onboardingSteps[onboardingStep].description}
                        </p>
                        <div className="flex justify-center mt-6">
                          <div className="flex gap-2">
                            {Array.from({ length: onboardingSteps.length }).map((_, index) => (
                              <div
                                key={index}
                                className={cn(
                                  "w-2 h-2 rounded-full transition-all duration-500",
                                  index === onboardingStep ? "bg-blue-100" : "bg-blue-400/30"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  goalPlan && (
                    <div className="flex flex-col space-y-6 pb-20">
                      <div className="space-y-2 p-4 text-center">
                        <h2 className="text-lg text-blue-100 font-bold">{goalPlan.goal.name}</h2>
                        <p className="text-sm text-blue-200">{goalPlan.goal.description}</p>
                        <p className="text-sm text-blue-300">Target Date: {new Date(goalPlan.goal.deadline).toLocaleDateString()}</p>
                      </div>
                      <ScrollArea className="max-h-[50vh]">
                        <Accordion type="single" collapsible className="w-full">
                          {goalPlan.goal.milestones.map((milestone, index) => (
                            <AccordionItem key={index} value={`milestone-${index}`} className="border-blue-400/30">
                              <AccordionTrigger className="text-blue-100 hover:text-blue-200">
                                {milestone.name}
                              </AccordionTrigger>
                              <AccordionContent className="text-blue-100">
                                <div className="space-y-4 p-4">
                                  <p className="text-sm text-blue-200">{milestone.description}</p>
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-blue-300">Tasks:</h4>
                                    <ul className="list-disc pl-4 space-y-2">
                                      {milestone.tasks.map((task, taskIndex) => (
                                        <li key={taskIndex} className="text-sm">
                                          <span className="font-medium">{task.name}</span>
                                          {task.description && (
                                            <p className="text-blue-300 text-xs mt-1">{task.description}</p>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </ScrollArea>

                      <div className="fixed bottom-0 left-0 right-0 bg-blue-900/95 backdrop-blur-sm border-t border-blue-400/20 p-4">
                        <div className="max-w-2xl mx-auto">
                          <p className="text-blue-100 mb-2 text-sm sm:text-base text-center">
                            Download your goal plan:
                          </p>
                          <div className="flex gap-2 sm:gap-3">
                            <Button 
                              variant="outline" 
                              onClick={() => downloadMarkdown("txt")}
                              className="flex-1 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-transparent hover:from-indigo-600 hover:to-blue-600 transition-all duration-200"
                            >
                              <span className="mr-1 sm:mr-1.5">📄</span>
                              TXT
                            </Button>
                            <Button 
                              onClick={() => downloadMarkdown("md")}
                              className="flex-1 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all duration-200"
                            >
                              <span className="mr-1 sm:mr-1.5">📝</span>
                              Markdown
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Floating Feedback Button - Made more mobile friendly */}
      <Button 
        variant="outline"
        className="fixed bottom-4 right-4 z-50 bg-blue-100 text-blue-900 hover:bg-blue-200 transition-colors duration-200 px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base rounded-full shadow-lg"
        onClick={() => setShowFeedback(true)}
      >
        Feedback
      </Button>

      {/* Feedback Dialog - Enhanced for mobile */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="w-[95vw] max-w-[400px] p-4 sm:p-6 rounded-lg bg-gradient-to-b from-blue-950 to-blue-900 border border-blue-400/30 shadow-2xl">
          <DialogHeader className="space-y-2 sm:space-y-3">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-blue-100 text-center sm:text-left">
              We value your feedback
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4">
            <Textarea 
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us what you think about our site..."
              className="w-full min-h-[120px] sm:min-h-[150px] text-sm sm:text-base p-3 sm:p-4 bg-blue-900/50 rounded-lg text-blue-100 border border-blue-400/30 shadow-inner transition-all duration-200 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50"
            />
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setFeedbackText("")
                setShowFeedback(false)
              }}
              className="w-full sm:w-auto p-2 sm:p-3 text-sm sm:text-base border-blue-400/50 text-blue-900 hover:bg-blue-200 transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleFeedbackSubmit}
              className="w-full sm:w-auto p-2 sm:p-3 text-sm sm:text-base bg-blue-100 text-blue-900 hover:bg-blue-200 transition-all duration-200"
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

