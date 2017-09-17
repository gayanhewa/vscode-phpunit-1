import { Diagnostic, DiagnosticCollection, DiagnosticSeverity, Range, TextEditor, TextLine, Uri } from 'vscode'
import { Message, State } from './parser'

import { Store } from './store'

export class DiagnosticManager {
    public constructor(private diagnostics: DiagnosticCollection) {}

    public handle(store: Store, editor: TextEditor) {
        this.diagnostics.clear()

        store.forEach((messages: Message[], file: string) => {
            this.diagnostics.set(Uri.file(file), this.covertToDiagnostic(messages, editor))
        })
    }

    public dispose() {
        this.diagnostics.clear()
        this.diagnostics.dispose()
    }

    protected covertToDiagnostic(messages: Message[], editor: TextEditor): Diagnostic[] {
        return messages.map((message: Message) => {
            return new Diagnostic(
                this.messageToRange(message, editor),
                message.error.fullMessage,
                message.state === State.FAILED ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning
            )
        })
    }

    protected messageToRange(message: Message, editor: TextEditor) {
        const textLine: TextLine = editor.document.lineAt(message.lineNumber)

        return new Range(
            textLine.lineNumber,
            textLine.firstNonWhitespaceCharacterIndex,
            textLine.lineNumber,
            textLine.range.end.character + 1
        )
    }
}
