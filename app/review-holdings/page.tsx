'use client';

import { useEffect } from 'react';
import {
  EXPERIMENT_CHANNELS_KEY,
  readExperimentChannels,
  EXPERIMENT_CHANNELS_EVENT,
} from '@/lib/experiment-channels';
import {
  collectReviewHoldings,
  collectHomeExperiments,
  trustedReviewParent,
} from '@/lib/review-holdings';

export default function ReviewHoldingsBridge() {
  useEffect(() => {
    if (window.parent === window) return;
    let summaryRequest: { origin: string; requestId: string } | null = null;
    function sendSummary(origin: string, requestId: string) {
      try {
        const experiments = collectHomeExperiments(readExperimentChannels(localStorage.getItem(EXPERIMENT_CHANNELS_KEY)));
        window.parent.postMessage({ type: 'owlmate:home-summary-result', requestId, status: 'ok', experiments }, origin);
      } catch {
        window.parent.postMessage({ type: 'owlmate:home-summary-result', requestId, status: 'error' }, origin);
      }
    }
    function changed() { if (summaryRequest) sendSummary(summaryRequest.origin, summaryRequest.requestId); }
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
        !['owlmate:review-holdings-request', 'owlmate:home-summary-request'].includes(event.data?.type) ||
        typeof event.data.requestId !== 'string' ||
        !/^[\w-]{1,80}$/.test(event.data.requestId)
      )
        return;
      if (event.data.type === 'owlmate:home-summary-request') {
        summaryRequest = { origin: event.origin, requestId: event.data.requestId };
        sendSummary(event.origin, event.data.requestId);
        return;
      }
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
    window.addEventListener('storage', changed);
    window.addEventListener(EXPERIMENT_CHANNELS_EVENT, changed);
    return () => {
      window.removeEventListener('message', receive);
      window.removeEventListener('storage', changed);
      window.removeEventListener(EXPERIMENT_CHANNELS_EVENT, changed);
    };
  }, []);
  return null;
}
