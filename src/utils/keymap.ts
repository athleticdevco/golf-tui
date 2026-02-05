import type { Tour, View } from '../api/types.js';

export type Hint = { key: string; label: string };

export type HintContext = {
  view: View;
  isSearchFocused: boolean;
  isCommandMode: boolean;
  isSearchMode: boolean;
  hasBreadcrumbs: boolean;
  scorecardAvailable: boolean;
  tour: Tour;
};

function push(hints: Hint[], key: string, label: string) {
  hints.push({ key, label });
}

export function getHints(ctx: HintContext): Hint[] {
  const hints: Hint[] = [];

  // Search/command mode
  if (ctx.isSearchFocused) {
    if (ctx.isCommandMode) {
      push(hints, 'j/k', 'nav');
      push(hints, 'Enter', 'run');
      push(hints, 'Esc', 'cancel');
      return hints;
    }

    if (ctx.isSearchMode) {
      push(hints, '↑/↓', 'nav');
      push(hints, 'Enter', 'open');
      push(hints, 'Esc', 'cancel');
      return hints;
    }

    push(hints, 'Esc', 'cancel');
    return hints;
  }

  // Global
  push(hints, '/', 'cmds');
  push(hints, '?', 'help');
  push(hints, 'q', 'quit');

  // View-specific
  switch (ctx.view) {
    case 'leaderboard':
      push(hints, 's', 'search');
      push(hints, 'j/k', 'nav');
      push(hints, 'Enter', 'player');
      if (ctx.scorecardAvailable) push(hints, 'c', 'card');
      push(hints, 'r', 'refresh');
      push(hints, 'Tab', 'tour');
      break;
    case 'schedule':
      push(hints, 's', 'search');
      push(hints, 'j/k', 'nav');
      push(hints, 'Enter', 'event');
      push(hints, 'o', 'sort');
      push(hints, 'Esc', 'back');
      // Tab does not do anything here (no crumbs)
      break;
    case 'players':
      push(hints, 's', 'search');
      push(hints, 'Esc', 'back');
      break;
    case 'player':
      push(hints, 'j/k', 'nav');
      push(hints, 't', 'stats');
      push(hints, 'Enter', 'event');
      if (ctx.hasBreadcrumbs) push(hints, 'Tab', 'crumbs');
      push(hints, 'Esc', 'back');
      break;
    case 'stats':
      push(hints, 's', 'filter');
      push(hints, 'j/k', 'nav');
      push(hints, 'Enter', 'detail');
      push(hints, 'o', 'sort');
      if (ctx.hasBreadcrumbs) push(hints, 'Tab', 'crumbs');
      push(hints, 'Esc', 'back');
      break;
    case 'event-leaderboard':
      push(hints, 'j/k', 'nav');
      push(hints, 'Enter', 'player');
      if (ctx.scorecardAvailable) push(hints, 'c', 'card');
      if (ctx.hasBreadcrumbs) push(hints, 'Tab', 'crumbs');
      push(hints, 'Esc', 'back');
      break;
    case 'scorecard':
      push(hints, '1-4', 'round');
      if (ctx.hasBreadcrumbs) push(hints, 'Tab', 'crumbs');
      push(hints, 'Esc', 'back');
      break;
    default:
      push(hints, 'Esc', 'close');
      break;
  }

  return hints;
}
