"use client";

import { AvatarUpload } from "@/components/ui/avatar-upload";

interface AvatarDemoProps {
  currentAvatar?: string;
  userName?: string;
}

export function AvatarDemo({
  currentAvatar,
  userName = "Demo User",
}: AvatarDemoProps) {
  const handleAvatarChange = (newAvatarUrl: string) => {
    console.log("Avatar changed to:", newAvatarUrl);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Avatar Upload Demo
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Small Avatar */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Small Avatar</h3>
            <AvatarUpload
              currentAvatar={currentAvatar}
              userName={userName}
              onAvatarChange={handleAvatarChange}
              size="sm"
            />
          </div>

          {/* Medium Avatar */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Medium Avatar</h3>
            <AvatarUpload
              currentAvatar={currentAvatar}
              userName={userName}
              onAvatarChange={handleAvatarChange}
              size="md"
            />
          </div>

          {/* Large Avatar */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Large Avatar</h3>
            <AvatarUpload
              currentAvatar={currentAvatar}
              userName={userName}
              onAvatarChange={handleAvatarChange}
              size="lg"
            />
          </div>
        </div>

        {/* With Upload Area */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">With Upload Area</h3>
          <AvatarUpload
            currentAvatar={currentAvatar}
            userName={userName}
            onAvatarChange={handleAvatarChange}
            size="lg"
            showUploadArea={true}
          />
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            How to Use
          </h3>
          <ul className="text-blue-800 space-y-2">
            <li>
              • <strong>Hover</strong> over the avatar to see the "Change"
              overlay
            </li>
            <li>
              • <strong>Click</strong> on the avatar to open file picker
            </li>
            <li>
              • <strong>Drag & Drop</strong> an image file onto the avatar
            </li>
            <li>
              • <strong>Preview</strong> shows before upload with option to
              cancel
            </li>
            <li>
              • <strong>Upload progress</strong> is shown during the process
            </li>
            <li>
              • <strong>Success/Error</strong> messages appear via toast
              notifications
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
