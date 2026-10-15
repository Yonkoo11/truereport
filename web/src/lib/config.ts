import { setNetworkId, type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';

/** Which Midnight network this build reads. Set at build time; nothing is fetched to decide it. */
const ENDPOINTS = {
  undeployed: {
    label: 'local test network',
    indexer: 'http://127.0.0.1:8088/api/v4/graphql',
    indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
    proofServer: 'http://127.0.0.1:6300',
  },
  preview: {
    label: 'Midnight Preview',
    indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    proofServer: 'http://127.0.0.1:6300',
  },
} as const;

type Net = keyof typeof ENDPOINTS;

const net: Net = import.meta.env.VITE_NETWORK === 'undeployed' ? 'undeployed' : 'preview';
setNetworkId(net as NetworkId);

export const NETWORK = { id: net, ...ENDPOINTS[net] };

/** Empty until the registry contract is deployed on this network. */
export const CONTRACT_ADDRESS: string = (import.meta.env.VITE_CONTRACT_ADDRESS ?? '').trim();

export const SITE_DOMAIN = 'truereport.vercel.app';
export const VERIFY_BASE = `${import.meta.env.VITE_VERIFY_BASE ?? `https://${SITE_DOMAIN}`}/verify`;

/** Fragments of real reports issued on this network, for the home page examples. Empty hides them. */
export const EXAMPLE_GENUINE: string = (import.meta.env.VITE_EXAMPLE_GENUINE ?? '').trim();
export const EXAMPLE_REVOKED: string = (import.meta.env.VITE_EXAMPLE_REVOKED ?? '').trim();
