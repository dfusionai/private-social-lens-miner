declare const __BUILD_VERSION__: string;

interface UpdateFeedConfig {
  provider: 's3';
  bucket: string;
  path: string;
  region: string;
}

export const environment = {
  production: true,
  version: __BUILD_VERSION__,
  dev: false,
  updateFeed: {
    provider: 's3' as const,
    bucket: 'dfusionai-dlp-miner ',
    path: '/updates',
    region: 'us-east-1'
  } as UpdateFeedConfig
};
