import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-yellow-400 mb-4">
          🎮 Job Quest
        </h1>
        <p className="text-gray-300 text-lg mb-8">
          Find local gigs that feel like video game quests. Earn XP, level up, and build your reputation.
        </p>
        <div className="flex gap-4 justify-center mb-8">
          <Link href="/register" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3 px-8 rounded text-lg">
            Start Your Quest
          </Link>
          <Link href="/map" className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded text-lg">
            Browse Quests
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-800 rounded p-4">
            <div className="text-yellow-400 text-2xl mb-2">⚔️</div>
            <div className="font-bold">Quest Board</div>
            <div className="text-gray-400">Find jobs near you</div>
          </div>
          <div className="bg-gray-800 rounded p-4">
            <div className="text-yellow-400 text-2xl mb-2">🏆</div>
            <div className="font-bold">XP & Levels</div>
            <div className="text-gray-400">Earn rewards</div>
          </div>
          <div className="bg-gray-800 rounded p-4">
            <div className="text-yellow-400 text-2xl mb-2">🛡️</div>
            <div className="font-bold">Safety First</div>
            <div className="text-gray-400">GPS check-ins</div>
          </div>
        </div>
      </div>
    </div>
  );
}
