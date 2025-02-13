export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 h-full w-full bg-gradient-to-b from-blue-950 to-blue-900">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-700/20 via-blue-900/30 to-blue-950/50 backdrop-blur-[1px]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 50%, var(--tw-gradient-stops)),
            radial-gradient(circle at 85% 30%, var(--tw-gradient-stops))
          `,
        }}
      />
      <div className="absolute inset-0 bg-blue-950/20" />
    </div>
  )
}

