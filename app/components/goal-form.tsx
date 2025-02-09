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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const generatedMarkdown = generateMarkdown(formData)
    setMarkdown(generatedMarkdown)
    setIsLoading(false)
    setShowDialog(true)
  }

  const generateMarkdown = (data: typeof formData) => {
    return `# Goal Planning Document

## 🎯 Main Goal
${data.goal}

## 📝 Action Plan
${data.what}

## 💡 Motivation
${data.why}

## ⏱️ Timeline
Target completion: ${data.when}

---
Generated with Goal Planner ✨
`
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Your Goal Plan</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{markdown}</ReactMarkdown>
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

