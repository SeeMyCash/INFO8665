/**
 * CameraCommandContext — carries a pending voice/keyboard command from
 * the global listener in App.tsx down to InferenceScreen.
 *
 * App.tsx dispatches a command (+ navigates to the Scan tab if needed).
 * InferenceScreen consumes and clears the command via useFocusEffect.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';

/** All commands the voice engine and keyboard can issue. */
export type CameraCommand =
    | 'snap'        // capture one frame (start camera first if not open)
    | 'go-live'     // start live scanning (start camera first if not open)
    | 'stop-live'   // stop live scanning
    | 'rescan'      // force rescan during hold/announce phase
    | 'flip'        // flip camera facing
    | 'stop'        // stop camera entirely
    | null;

type CameraCommandContextType = {
    pendingCommand: CameraCommand;
    dispatch: (cmd: CameraCommand) => void;
    clear: () => void;
};

const CameraCommandContext = createContext<CameraCommandContextType>({
    pendingCommand: null,
    dispatch: () => {},
    clear: () => {},
});

export function CameraCommandProvider({ children }: { children: React.ReactNode }) {
    const [pendingCommand, setPendingCommand] = useState<CameraCommand>(null);
    const dispatch = useCallback((cmd: CameraCommand) => setPendingCommand(cmd), []);
    const clear = useCallback(() => setPendingCommand(null), []);

    return (
        <CameraCommandContext.Provider value={{ pendingCommand, dispatch, clear }}>
            {children}
        </CameraCommandContext.Provider>
    );
}

export function useCameraCommand() {
    return useContext(CameraCommandContext);
}
