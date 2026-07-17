import React from 'react';
import {
  WebControlPanelQueue as BaseWebControlPanelQueue,
  type WebControlPanelQueueProps as BaseWebControlPanelQueueProps,
} from './control-surface';

export type WebControlPanelQueueProps = Omit<BaseWebControlPanelQueueProps, 'title'> & {
  /** Text for standard queues or a governed rich heading for queue-local controls. */
  title?: React.ReactNode;
};

/**
 * Public queue adapter that preserves the stable control-surface runtime while
 * allowing a rich heading where a queue owns a local disclosure control.
 */
export function WebControlPanelQueue({ title, ...props }: WebControlPanelQueueProps) {
  return (
    <BaseWebControlPanelQueue
      {...props}
      title={title as unknown as string | undefined}
    />
  );
}
