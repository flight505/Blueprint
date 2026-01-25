export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Activity Bar */}
      <aside className="w-12 flex-shrink-0 flex flex-col bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="flex-1 flex flex-col items-center pt-4 gap-2">
          <ActivityBarButton icon="💬" label="Chat" active />
          <ActivityBarButton icon="📁" label="Explorer" />
          <ActivityBarButton icon="🔍" label="Search" />
          <ActivityBarButton icon="📋" label="Planning" />
          <ActivityBarButton icon="📥" label="Export" />
          <ActivityBarButton icon="🕐" label="History" />
        </div>
        <div className="flex flex-col items-center pb-4 gap-2">
          <ActivityBarButton icon="⚙️" label="Settings" />
          <ActivityBarButton icon="❓" label="Help" />
        </div>
      </aside>

      {/* Left Pane - Chat */}
      <div className="w-[40%] min-w-[300px] flex flex-col border-r border-gray-200 dark:border-gray-700">
        <header className="h-10 flex items-center px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="text-sm font-medium">Agent Chat</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <p className="text-lg mb-2">Welcome to Blueprint</p>
            <p className="text-sm">Start a new project or open an existing one</p>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <input
            type="text"
            placeholder="Type a message..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Resize Handle */}
      <div className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 cursor-col-resize drag-handle" />

      {/* Right Pane - Content */}
      <div className="flex-1 min-w-[300px] flex flex-col">
        <header className="h-10 flex items-center px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex gap-1">
            <Tab label="Welcome" active />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">Blueprint</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              AI-powered project planning with Claude Agent SDK
            </p>

            <div className="grid grid-cols-2 gap-4">
              <WelcomeCard
                title="New Project"
                description="Start a new planning project with the wizard"
                icon="✨"
              />
              <WelcomeCard
                title="Open Project"
                description="Open an existing project folder"
                icon="📂"
              />
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Recent Projects</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No recent projects</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityBarButton({ icon, label, active }: { icon: string; label: string; active?: boolean }) {
  return (
    <button
      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
        active
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
      title={label}
    >
      <span className="text-lg">{icon}</span>
    </button>
  );
}

function Tab({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={`px-3 py-1 text-sm rounded-t-lg transition-colors ${
        active
          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-t border-x border-gray-200 dark:border-gray-700'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
      }`}
    >
      {label}
    </button>
  );
}

function WelcomeCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left">
      <span className="text-2xl mb-2 block">{icon}</span>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </button>
  );
}
