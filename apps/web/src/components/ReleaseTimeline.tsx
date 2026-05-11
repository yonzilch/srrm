import { Release } from '@srrm/shared';

interface ReleaseTimelineProps {
  releases: Release[];
  filter?: string;
}

export default function ReleaseTimeline({ releases, filter = '' }: ReleaseTimelineProps) {
  // Group releases by date
  const grouped = releases.reduce((acc: Record<string, Release[]>, release) => {
    if (filter && !release.repoFullName.toLowerCase().includes(filter.toLowerCase())) {
      return acc;
    }
    const date = release.publishedAt.split('T')[0]; // YYYY-MM-DD
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(release);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (dates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No releases match the current filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dates.map(date => (
        <div key={date} className="border-t pt-4">
          <h2 className="text-lg font-semibold mb-2">{date}</h2>
          <div className="space-y-3">
            {grouped[date].map(release => (
              <div key={release.id} className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium">{release.repoFullName} {release.tagName}</h3>
                <p className="mt-1 line-clamp-2">{release.name}</p>
                {release.body && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p className="line-clamp-3">{release.body}</p>
                  </div>
                )}
                <a
                  href={release.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
                >
                  View Release
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
