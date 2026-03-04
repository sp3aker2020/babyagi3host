import Docker from 'dockerode';
import { decrypt } from './crypto';

const docker = new Docker({
    socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
});

const BABYAGI_IMAGE = 'babyagi3:latest';
const DATA_ROOT = process.env.BABYAGI_DATA_ROOT || '/data/babyagi3-host';

export interface InstanceConfig {
    instanceId: string;
    ownerName?: string;
    ownerEmail?: string;
    anthropicApiKey?: string;
    openaiApiKey?: string;
    agentmailApiKey?: string;
    sendblueApiKey?: string;
    sendblueApiSecret?: string;
    sendbluePhone?: string;
    ownerPhone?: string;
}

function containerName(instanceId: string): string {
    return `babyagi-${instanceId.replace(/-/g, '').slice(0, 16)}`;
}

export async function pullImage(): Promise<void> {
    return new Promise((resolve, reject) => {
        docker.pull(BABYAGI_IMAGE, (err: Error, stream: NodeJS.ReadableStream) => {
            if (err) return reject(err);
            docker.modem.followProgress(stream, (err: Error | null) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}
export async function provisionInstance(config: InstanceConfig): Promise<string> {
    const name = containerName(config.instanceId);
    const hostDataPath = `${DATA_ROOT}/${config.instanceId}`;
    console.log(`Provisioning instance ${config.instanceId}, container name: ${name}`);

    const env: string[] = [];

    if (config.ownerName) env.push(`OWNER_NAME=${config.ownerName}`);
    if (config.ownerEmail) env.push(`OWNER_EMAIL=${config.ownerEmail}`);
    if (config.anthropicApiKey) env.push(`ANTHROPIC_API_KEY=${config.anthropicApiKey}`);
    if (config.openaiApiKey) env.push(`OPENAI_API_KEY=${config.openaiApiKey}`);
    if (config.agentmailApiKey) env.push(`AGENTMAIL_API_KEY=${config.agentmailApiKey}`);
    if (config.sendblueApiKey) env.push(`SENDBLUE_API_KEY=${config.sendblueApiKey}`);
    if (config.sendblueApiSecret) env.push(`SENDBLUE_API_SECRET=${config.sendblueApiSecret}`);
    if (config.sendbluePhone) env.push(`SENDBLUE_PHONE_NUMBER=${config.sendbluePhone}`);
    if (config.ownerPhone) env.push(`OWNER_PHONE=${config.ownerPhone}`);

    // Always require auth via API token matching the instance ID as a simple secret
    env.push('BABYAGI_API_AUTH=auto');
    env.push(`BABYAGI_API_TOKEN=${config.instanceId}`);

    // Remove existing container if it exists
    try {
        console.log(`Checking for existing container ${name}...`);
        const existing = docker.getContainer(name);
        await existing.stop().catch(() => { });
        await existing.remove().catch(() => { });
    } catch { }

    console.log(`Creating container ${name}...`);

    // Assign a unique host port based on instance ID (range 6000-6999)
    const hostPort = 6000 + (parseInt(config.instanceId.replace(/-/g, '').slice(0, 8), 16) % 1000);
    console.log(`Mapping container port 5000 -> host port ${hostPort}`);

    const container = await docker.createContainer({
        Image: BABYAGI_IMAGE,
        name,
        Env: env,
        ExposedPorts: { '5000/tcp': {} },
        HostConfig: {
            Binds: [`${hostDataPath}:/home/babyagi/.babyagi/memory`],
            PortBindings: { '5000/tcp': [{ HostPort: String(hostPort) }] },
            RestartPolicy: { Name: 'unless-stopped' },
            Memory: 512 * 1024 * 1024, // 512MB max for Python
            MemorySwap: 512 * 1024 * 1024,
            NanoCpus: 500_000_000, // 0.5 CPU
        },
        Labels: {
            'babyagi.instance': config.instanceId,
            'babyagi.managed': 'true',
        },
    });

    await container.start();
    console.log(`Container ${name} started successfully: ${container.id}`);
    return container.id;
}

export async function stopInstance(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.stop().catch(() => { });
}

export async function startInstance(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.start();
}

export async function removeInstance(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.stop().catch(() => { });
    await container.remove();
}

export async function getInstanceStatus(containerId: string): Promise<string> {
    try {
        const container = docker.getContainer(containerId);
        const info = await container.inspect();
        return info.State?.Status || 'unknown';
    } catch {
        return 'not_found';
    }
}
