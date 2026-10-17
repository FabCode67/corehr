"use client"

import { Component, type ReactNode } from "react"

/** Isolates a page section so one failing block shows a small notice instead of
 *  taking the whole page down. */
export class SectionBoundary extends Component<{ children: ReactNode; label?: string }, { failed: boolean; digest?: string }> {
  state = { failed: false, digest: undefined as string | undefined }

  static getDerivedStateFromError(error: Error & { digest?: string }) {
    return { failed: true, digest: error.digest }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="rounded-lg border border-dashed border-destructive/40 p-4 text-sm text-muted-foreground">
          {this.props.label ?? "This section"} couldn&apos;t load.
          {this.state.digest ? <span className="ml-1 font-mono text-xs">Ref: {this.state.digest}</span> : null}
        </div>
      )
    }
    return this.props.children
  }
}
