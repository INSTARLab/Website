export type W5Family = 'community' | 'labs' | 'news' | 'fellowship' | 'tech-transfer';

export type W5VisualMode =
  | 'orientation'
  | 'evidence'
  | 'observation'
  | 'sequence'
  | 'contrast'
  | 'participation'
  | 'connection';

export interface W5MediaReference {
  readonly src: string;
  readonly role: 'orientation' | 'observation' | 'system-mark';
  readonly altDecision: 'editorial-description';
  readonly reuseReason?: 'shared-consortium-mark';
}

export interface W5RouteRecord {
  readonly path: `/${string}/`;
  readonly family: W5Family;
  readonly title: string;
  readonly description: string;
  readonly signature: readonly [W5VisualMode, W5VisualMode, W5VisualMode, ...W5VisualMode[]];
  readonly pageJob: string;
  readonly readyAction: string;
  readonly earlyAction: string;
  readonly media: readonly W5MediaReference[];
}
