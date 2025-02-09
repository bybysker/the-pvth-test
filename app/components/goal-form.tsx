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

const BACKEND_URL = "https://backend-65271787895.europe-west1.run.app"

export function GoalForm() {
  const [formData, setFormData] = useState({
    goal: "",
    what: "",
    why: "",
    when: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [markdown, setMarkdown] = useState("")
  const [smartGoal, setSmartGoal] = useState("")
  const [editableSmartGoal, setEditableSmartGoal] = useState("")
  const [showSmartGoalValidation, setShowSmartGoalValidation] = useState(false)
  const [isEditingSmartGoal, setIsEditingSmartGoal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // First API call to get SMART goal
      const smartGoalResponse = await fetch(`${BACKEND_URL}/smart_goal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: "temp_user_id", // You might want to implement proper user management
          pre_goal_data: {
            goal: formData.goal,
            what: formData.what,
            why: formData.why,
            when: formData.when,
          }
        }),
      })

      if (!smartGoalResponse.ok) {
        throw new Error('Failed to generate SMART goal')
      }

      const smartGoalData = await smartGoalResponse.json()
      setSmartGoal(smartGoalData)
      setEditableSmartGoal(smartGoalData)
      setShowSmartGoalValidation(true)
      setIsLoading(false)
    } catch (error) {
      console.error('Error generating SMART goal:', error)
      setIsLoading(false)
    }
  }

  const handleSmartGoalValidation = async (isValid: boolean) => {
    if (!isValid) {
      setIsEditingSmartGoal(true)
      return
    }

    setIsLoading(true)
    try {
      // Second API call to generate milestones and tasks
      const milestonesResponse = await fetch(`${BACKEND_URL}/generate_milestones_and_tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validated_goal: isEditingSmartGoal ? editableSmartGoal : smartGoal,
          user_id: "temp_user_id", // You might want to implement proper user management
        }),
      })

      if (!milestonesResponse.ok) {
        throw new Error('Failed to generate milestones and tasks')
      }

      const goalPlanData = await milestonesResponse.json()
      setMarkdown(goalPlanData)
      setShowSmartGoalValidation(false)
      setShowDialog(true)
      setIsEditingSmartGoal(false)
    } catch (error) {
      console.error('Error generating milestones and tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadMarkdown = (format: "md" | "txt") => {
    const content = format === "md" ? markdown : markdown.replace(/[#*`]/g, "").replace(/\n\n/g, "\n")
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
      <Card className="bg-blue-600/30 backdrop-blur-sm p-6 shadow-xl border-blue-400/30">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="goal" className="text-white">
              What's your goal?
            </Label>
            <Input
              id="goal"
              placeholder="e.g., Learn to play the guitar"
              className="bg-blue-700/50 border-blue-400/30 text-white placeholder:text-blue-300"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="what" className="text-white">
              What needs to be done?
            </Label>
            <Textarea
              id="what"
              placeholder="List the specific steps you'll take to achieve this goal"
              className="bg-blue-700/50 border-blue-400/30 text-white placeholder:text-blue-300 min-h-[100px]"
              value={formData.what}
              onChange={(e) => setFormData({ ...formData, what: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="why" className="text-white">
              Why is this important to you?
            </Label>
            <Textarea
              id="why"
              placeholder="Describe your motivation and the impact this will have"
              className="bg-blue-700/50 border-blue-400/30 text-white placeholder:text-blue-300 min-h-[100px]"
              value={formData.why}
              onChange={(e) => setFormData({ ...formData, why: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="when" className="text-white">
              Target completion date
            </Label>
            <Input
              id="when"
              type="date"
              className="bg-blue-700/50 border-blue-400/30 text-white"
              value={formData.when}
              onChange={(e) => setFormData({ ...formData, when: e.target.value })}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-white text-blue-700 hover:bg-blue-100 font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating your plan...
              </>
            ) : (
              "Get my plan"
            )}
          </Button>
        </form>
      </Card>

      {/* SMART Goal Validation Dialog */}
      <Dialog open={showSmartGoalValidation} onOpenChange={setShowSmartGoalValidation}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Validate Your SMART Goal</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              We've transformed your goal into a SMART goal. Please review and validate it:
            </p>
            {isEditingSmartGoal ? (
              <Textarea
                value={editableSmartGoal}
                onChange={(e) => setEditableSmartGoal(e.target.value)}
                className="w-full min-h-[150px] p-4 bg-gray-100 rounded-lg text-gray-900"
                placeholder="Edit your SMART goal here..."
              />
            ) : (
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-gray-900">{smartGoal}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            {isEditingSmartGoal ? (
              <>
                <Button variant="outline" onClick={() => {
                  setEditableSmartGoal(smartGoal)
                  setIsEditingSmartGoal(false)
                }}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  setSmartGoal(editableSmartGoal)
                  setIsEditingSmartGoal(false)
                  handleSmartGoalValidation(true)
                }}>
                  Save and Generate Plan
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleSmartGoalValidation(false)}>
                  Revise Goal
                </Button>
                <Button onClick={() => handleSmartGoalValidation(true)}>
                  Accept and Generate Plan
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Plan Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Your Goal Plan</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none py-6">
            <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
              <ReactMarkdown 
                components={{
                  h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 text-blue-100" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-3 text-blue-200" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-lg font-medium mb-2 text-blue-300" {...props} />,
                  p: ({node, ...props}) => <p className="mb-4 text-white/90" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 text-white/90" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 text-white/90" {...props} />,
                  li: ({node, ...props}) => <li className="mb-1" {...props} />,
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => downloadMarkdown("txt")}>
              Download as TXT
            </Button>
            <Button onClick={() => downloadMarkdown("md")}>Download as Markdown</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

