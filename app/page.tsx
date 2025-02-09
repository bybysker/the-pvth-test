import { GoalForm } from "./components/goal-form"
import { AnimatedBackground } from "./components/animated-background"

export default function Page() {
  return (
    <>
      <AnimatedBackground />
      <main className="min-h-screen px-4 py-6 text-white relative z-10">
        <div className="mx-auto max-w-md">
          <div className="mb-8 space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Goal Planner ✨</h1>
            <p className="text-lg text-blue-100">
              Transform your aspirations into actionable plans. Fill out the form below to create a structured roadmap
              for your goals.
            </p>
            <div className="grid grid-cols-3 gap-4 rounded-lg bg-blue-600/30 backdrop-blur-sm p-4 text-center text-sm">
              <div>
                <p className="font-semibold">Define</p>
                <p className="text-blue-200">Set clear objectives</p>
              </div>
              <div>
                <p className="font-semibold">Plan</p>
                <p className="text-blue-200">Break it down</p>
              </div>
              <div>
                <p className="font-semibold">Achieve</p>
                <p className="text-blue-200">Track progress</p>
              </div>
            </div>
          </div>
          <GoalForm />
        </div>
      </main>
    </>
  )
}
