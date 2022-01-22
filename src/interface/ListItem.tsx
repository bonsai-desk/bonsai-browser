export type Trigger = 'mouse' | 'hotkey';

export interface ListItem {
  id: string;
  item: any;
  Node: ({ active }: { active: boolean }) => JSX.Element;
  onClick?: (trigger: Trigger) => void;
  onTag?: () => void;
  onIdChange?: () => void;
  onLazyIdChange?: () => void;
  delete?: {
    onClick: (trigger: Trigger) => void;
    bounceOffEnd: boolean;
  };
  onAltClick?: (trigger: Trigger) => void;
}
