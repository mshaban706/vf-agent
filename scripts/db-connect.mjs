import pg from 'pg';

const POOLER_REGIONS = [
  'ap-southeast-1', 'ap-south-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
  'us-east-1', 'us-east-2', 'us-west-1', 'eu-central-1', 'eu-west-1', 'eu-west-2',
  'sa-east-1', 'ca-central-1',
];

async function tryConnect(config) {
  const client = new pg.Client({
    ...config,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  return client;
}

/** Connect to Supabase Postgres with pooler fallback (IPv4). */
export async function connectDatabase(connectionString) {
  try {
    return await tryConnect({ connectionString });
  } catch (err) {
    const url = new URL(connectionString);
    const direct = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(url.hostname);
    if (!direct) throw err;

    console.log(`Direct host unreachable (${err.message.split('\n')[0]}). Trying IPv4 session pooler...`);
    const projectRef = direct[1];

    for (const prefix of ['aws-1', 'aws-0']) {
      for (const region of POOLER_REGIONS) {
        const host = `${prefix}-${region}.pooler.supabase.com`;
        try {
          const client = await tryConnect({
            host,
            port: 5432,
            user: `postgres.${projectRef}`,
            password: url.password,
            database: 'postgres',
          });
          console.log(`Connected via pooler: ${host}`);
          return client;
        } catch {
          /* try next */
        }
      }
    }
    throw new Error('Could not connect to database via direct host or session pooler.');
  }
}
