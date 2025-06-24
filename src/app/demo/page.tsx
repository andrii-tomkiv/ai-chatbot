import Link from 'next/link';

export default function DemoPage() {
  const examples = [
    {
      name: 'Default ConceiveAbilities',
      description: 'Standard surrogacy and fertility assistance',
      url: '/iframe',
      params: {} as Record<string, string>
    },
    {
      name: 'Customer Service',
      description: 'General customer support and assistance',
      url: '/iframe',
      params: { prompt: 'customerService' } as Record<string, string>
    },
    {
      name: 'Technical Support',
      description: 'Technical and troubleshooting assistance',
      url: '/iframe',
      params: { prompt: 'technical' } as Record<string, string>
    },
    {
      name: 'Sales Consultation',
      description: 'Product and service consultation',
      url: '/iframe',
      params: { prompt: 'sales' } as Record<string, string>
    },
    {
      name: 'Educational',
      description: 'Learning and educational support',
      url: '/iframe',
      params: { prompt: 'educational' } as Record<string, string>
    },
    {
      name: 'Custom with More Results',
      description: 'Customer service with 5 search results instead of 3',
      url: '/iframe',
      params: { prompt: 'customerService', maxResults: '5' } as Record<string, string>
    }
  ];

  const buildUrl = (baseUrl: string, params: Record<string, string>) => {
    const url = new URL(baseUrl, 'http://localhost:3002');
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Chatbot URL Parameter Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how you can customize the chatbot behavior using URL parameters.
            Each example shows a different system prompt and configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {examples.map((example, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {example.name}
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                {example.description}
              </p>
              
              <div className="space-y-3">
                <Link
                  href={buildUrl(example.url, example.params)}
                  target="_blank"
                  className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Open Chatbot
                </Link>
                
                <div className="text-xs text-gray-500">
                  <strong>URL:</strong>
                  <code className="block mt-1 p-2 bg-gray-100 rounded text-xs break-all">
                    {buildUrl(example.url, example.params)}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Available Parameters
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Prompt Types</h3>
              <ul className="space-y-2 text-sm">
                <li><code className="bg-gray-100 px-2 py-1 rounded">default</code> - ConceiveAbilities surrogacy assistant</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">customerService</code> - General customer service</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">technical</code> - Technical support</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">sales</code> - Sales consultation</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">educational</code> - Educational support</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Other Parameters</h3>
              <ul className="space-y-2 text-sm">
                <li><code className="bg-gray-100 px-2 py-1 rounded">maxResults</code> - Number of search results (default: 3)</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">model</code> - Mistral model to use (default: mistral-small-latest)</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Example Usage in Your Project:</h4>
            <code className="text-sm text-blue-800 block">
              {`<iframe src="http://localhost:3002/iframe?prompt=customerService&maxResults=5" width="100%" height="600px"></iframe>`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
} 