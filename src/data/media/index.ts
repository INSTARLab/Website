import rawPolicies from './public-media-policy.json';
import type {
  MediaAsset,
  MediaAssetOverrides,
  PublicMediaPolicy,
} from './types';
import { normalizeMediaUrl, stableMediaId } from '../../utils/media/ids';

export const publicMediaPolicies = rawPolicies as readonly PublicMediaPolicy[];

export function publicMediaPolicyFor(url: string): PublicMediaPolicy | undefined {
  const normalized = normalizeMediaUrl(url);
  if (/^https?:\/\//i.test(normalized)) return undefined;

  return publicMediaPolicies.find((policy) => new RegExp(policy.match).test(normalized));
}

export function publicMediaFor(
  url: `/${string}`,
  overrides: MediaAssetOverrides = {},
): MediaAsset | undefined {
  const policy = publicMediaPolicyFor(url);
  if (!policy) return undefined;

  return {
    id: stableMediaId(url, policy.idPrefix),
    source: { kind: 'public', url },
    type: policy.type,
    role: policy.role,
    alt: overrides.alt ?? policy.alt,
    dimensions: policy.dimensions,
    sizes: overrides.sizes ?? policy.sizes,
    loading: overrides.loading ?? policy.loading,
    fetchpriority: overrides.fetchpriority ?? policy.fetchpriority,
    focalPoint: overrides.focalPoint ?? policy.focalPoint,
    provenance: overrides.provenance ?? policy.provenance,
    widths: overrides.widths ?? policy.widths,
    formats: overrides.formats ?? policy.formats,
    caption: overrides.caption,
    credit: overrides.credit,
    reuseReason: overrides.reuseReason ?? policy.reuseReason,
  };
}
