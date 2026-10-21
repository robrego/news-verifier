import type { Metadata } from 'next';
import { ToolsShell } from '@/components/ToolsShell';

export const metadata: Metadata = {
  title: 'Tools | Verify News',
  description: 'Check any page or selected text with one click, or share to Verify News from your phone.',
};

export default function ToolsPage() {
  return <ToolsShell />;
}
