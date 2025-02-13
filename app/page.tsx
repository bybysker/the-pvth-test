import { GoalForm } from "./components/goal-form"
import { AnimatedBackground } from "./components/animated-background"
import { Logo } from "./components/logo"

export default function Page() {
  return (
    <>
      <AnimatedBackground />
      <main className="min-h-screen px-4 py-12 text-white relative z-10">
        <div className="mx-auto max-w-md">
          <div className="mb-12 space-y-6">
            <div className="flex items-center gap-4 mb-8">
              <Logo className="w-16 h-16" />
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-100 to-white bg-clip-text text-transparent">
                The PVTH
              </h1>
            </div>
            <p className="text-lg text-blue-100 text-center leading-relaxed">
              Transform your aspirations into actionable plans. Fill out the form below to create a structured roadmap
              for your goals.
            </p>
            <div className="grid grid-cols-3 gap-6 rounded-xl bg-gradient-to-br from-blue-900/40 to-blue-950/60 backdrop-blur-sm p-6 text-center">
              <div className="space-y-2">
                <p className="font-semibold text-lg text-blue-100">Define</p>
                <p className="text-blue-300">Set clear objectives</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-lg text-blue-100">Plan</p>
                <p className="text-blue-300">Break it down</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-lg text-blue-100">Achieve</p>
                <p className="text-blue-300">Track progress</p>
              </div>
            </div>
          </div>
          <GoalForm />
        </div>
      </main>
    </>
  )
}
