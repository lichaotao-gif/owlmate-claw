'use client';

import { useEffect } from 'react';
import {
  EXPERIMENT_CHANNELS_KEY,
  readExperimentChannels,
} from '@/lib/experiment-channels';
import {
  collectReviewHoldings,
  trustedReviewParent,
} from '@/lib/review-holdings';

export default function ReviewHoldingsBridge() {
  useEffect(() => {
    if (window.parent === window) return;
    function receive(event: MessageEvent) {
      if (
        event.source !== window.parent ||
        !trustedReviewParent(
          event.origin,
          window.location.origin,
          process.env.NEXT_PUBLIC_OWLMATE_CONSOLE_ORIGIN,
          process.env.NODE_ENV === 'development',
        )
      )
        return;
      if (
        event.data?.type !== 'owlmate:review-holdings-request' ||
        typeof event.data.requestId !== 'string' ||
        !/^[\w-]{1,80}$/.test(event.data.requestId)
      )
        return;
      try {
        const holdings = collectReviewHoldings(
          readExperimentChannels(localStorage.getItem(EXPERIMENT_CHANNELS_KEY)),
        );
        window.parent.postMessage(
          {
            type: 'owlmate:review-holdings-result',
            requestId: event.data.requestId,
            status: 'ok',
            holdings,
          },
          event.origin,
        );
      } catch {
        window.parent.postMessage(
          {
            type: 'owlmate:review-holdings-result',
            requestId: event.data.requestId,
            status: 'error',
          },
          event.origin,
        );
      }
    }
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'owlmate:review-holdings-ready' }, '*');
    return () => window.removeEventListener('message', receive);
  }, []);
  return null;
}
