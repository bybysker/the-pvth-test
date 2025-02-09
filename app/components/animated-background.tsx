export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 animate-gradient-x"></div>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;charset=utf-8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1000 1000%22><path d=%22M0 0h1000v1000H0z%22 fill=%22none%22 stroke=%22%23fff%22 stroke-opacity=%22.05%22 stroke-width=%222%22/></svg>')] bg-[length:20px_20px]"></div>
      </div>
    </div>
  )
}

