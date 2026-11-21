import { Button } from "@/ui/components/ui/button";

function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-4xl font-bold">UniWorld</h1>
        <span className="rounded-full border px-2 py-0.5 text-xs font-medium">Beta</span>
      </div>
      <Button>Get started</Button>
    </main>
  );
}

export default App;
