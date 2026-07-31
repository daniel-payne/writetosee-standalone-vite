import { useState, useEffect, useRef, useCallback, type HTMLAttributes, type PropsWithChildren } from "react";
import { Form, useLoaderData, useActionData, useNavigation, useBlocker, useFetcher } from "react-router-dom";
import { useCharacters, useCharactersHash, type Character } from "@/data/process/manageCharacters";

type CharactersProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Characters({
  ...rest
}: PropsWithChildren<CharactersProps>) {
  useLoaderData();
  const actionData = useActionData() as any;
  const navigation = useNavigation();
  const fetcher = useFetcher();

  const [savedCharacters] = useCharacters();
  const [charactersHash] = useCharactersHash();

  const [characterList, setCharacterList] = useState<Character[]>(savedCharacters || []);

  const isExtracting = fetcher.state !== 'idle' || (navigation.state !== 'idle' && navigation.formData?.get('intent') === 'EXTRACT-CHARACTERS');

  // Sync state when savedCharacters change or action/cancel occurs
  useEffect(() => {
    if (actionData?.characters) {
      setCharacterList(actionData.characters);
    } else if (actionData?.cancelled) {
      setCharacterList(savedCharacters || []);
    }
  }, [actionData, savedCharacters]);

  useEffect(() => {
    if (fetcher.data?.characters) {
      setCharacterList(fetcher.data.characters);
    }
  }, [fetcher.data]);

  // Sync on cross-tab storage changes
  const lastSyncedHashRef = useRef(charactersHash);
  useEffect(() => {
    if (charactersHash && charactersHash !== lastSyncedHashRef.current) {
      lastSyncedHashRef.current = charactersHash;
      setCharacterList(savedCharacters || []);
    }
  }, [charactersHash, savedCharacters]);

  // Initial load sync
  useEffect(() => {
    if (savedCharacters && savedCharacters.length > 0 && characterList.length === 0) {
      setCharacterList(savedCharacters);
    }
  }, [savedCharacters]);

  // Check dirty state
  const isDirty = JSON.stringify(characterList) !== JSON.stringify(savedCharacters || []);
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const navigationStateRef = useRef(navigation.state);
  navigationStateRef.current = navigation.state;

  const blockerFunction = useCallback(
    ({ currentLocation, nextLocation }: any) => {
      if (!isDirtyRef.current) return false;
      if (navigationStateRef.current !== 'idle') return false;
      if (currentLocation.pathname === nextLocation.pathname) return false;
      return true;
    },
    []
  );

  const blocker = useBlocker(blockerFunction);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const proceed = window.confirm(
        'You have unsaved changes to characters. Are you sure you want to leave?'
      );
      if (proceed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const [cardTabs, setCardTabs] = useState<Record<number, 'description' | 'instructions' | 'picture'>>({});

  const getCardTab = (index: number) => cardTabs[index] || 'picture';
  const setCardTab = (index: number, tab: 'description' | 'instructions' | 'picture') => {
    setCardTabs(prev => ({ ...prev, [index]: tab }));
  };

  const handleCharacterChange = (index: number, field: string, value: string) => {
    setCharacterList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddCharacter = () => {
    setCharacterList(prev => [
      ...prev,
      { name: `Character ${prev.length + 1}`, description: '' }
    ]);
  };

  const handleRemoveCharacter = (index: number) => {
    setCharacterList(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtractCharacters = () => {
    fetcher.submit({ intent: 'EXTRACT-CHARACTERS' }, { method: 'post' });
  };

  return (
    <div {...rest} className={`p-4 w-full h-full overflow-auto flex flex-col ${rest.className || ''}`}>
      {/* Top action buttons */}
      <div className="flex items-center justify-center gap-3 mb-6 shrink-0">
        <button
          type="button"
          onClick={handleAddCharacter}
          className="btn btn-sm btn-ghost rounded-xl border border-base-content/10 hover:bg-base-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Character
        </button>

        <button
          type="button"
          onClick={handleExtractCharacters}
          disabled={isExtracting}
          className="btn btn-sm btn-primary bg-primary text-primary-content shadow-lg shadow-primary/20 rounded-xl"
        >
          {isExtracting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-primary-content" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Extracting...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
              </svg>
              Extract Characters
            </>
          )}
        </button>
      </div>

      {(actionData?.message || fetcher.data?.message) && (
        <div className="alert alert-success shadow-lg mb-4 text-xs font-semibold rounded-xl">
          <span>{actionData?.message || fetcher.data?.message}</span>
        </div>
      )}

      {(actionData?.error || fetcher.data?.error) && (
        <div className="alert alert-error shadow-lg mb-4 text-xs font-semibold rounded-xl">
          <span>{actionData?.error || fetcher.data?.error}</span>
        </div>
      )}

      {/* Form binding for MainLayout footer button */}
      <Form id="main-form" method="post" className="flex-1 flex flex-col min-h-0">
        <input type="hidden" name="charactersJson" value={JSON.stringify(characterList)} />

        {characterList.length === 0 ? (
          <div className="bg-base-100/60 backdrop-blur-md rounded-2xl p-10 shadow-sm border border-base-content/10 text-center my-auto">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6 0 3.375 3.375 0 0 1 6 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-base-content mb-2">No Characters Extracted Yet</h2>
            <p className="text-sm text-base-content/60 max-w-md mx-auto mb-6">
              Click <strong>"Extract Characters"</strong> to analyze your story text with AI and extract up to 10 characters automatically, or add characters manually.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleExtractCharacters}
                disabled={isExtracting}
                className="btn btn-primary shadow-lg shadow-primary/20 rounded-xl"
              >
                Extract Characters from Story
              </button>
              <button
                type="button"
                onClick={handleAddCharacter}
                className="btn btn-outline rounded-xl"
              >
                Add Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] gap-4 pb-4">
            {characterList.map((char, index) => (
              <div
                key={index}
                className="card bg-base-100/70 backdrop-blur-md shadow-md hover:shadow-lg border border-base-content/10 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col min-w-[min(100%,400px)] min-h-[440px]"
              >
                <div className="p-4 border-b border-base-content/10 bg-base-200/40 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {char.name ? char.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <input
                      type="text"
                      value={char.name}
                      onChange={(e) => handleCharacterChange(index, 'name', e.target.value)}
                      placeholder="Character Name"
                      className="input input-sm font-bold text-base bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-lg w-full"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveCharacter(index)}
                    title="Remove Character"
                    className="btn btn-xs btn-ghost text-error/70 hover:text-error hover:bg-error/10 rounded-lg p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>

                <div className="p-4 flex-1 flex flex-col min-h-0">
                  {/* Tabs: Picture, Description, Instructions */}
                  <div className="flex border-b border-base-content/10 mb-3 gap-1 shrink-0">
                    <button
                      type="button"
                      className={`px-3 py-1 text-xs font-semibold rounded-t-lg transition-colors ${getCardTab(index) === 'picture' ? 'bg-primary/10 text-primary border-b-2 border-primary font-bold' : 'text-base-content/60 hover:text-base-content'}`}
                      onClick={() => setCardTab(index, 'picture')}
                    >
                      Picture
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 text-xs font-semibold rounded-t-lg transition-colors ${getCardTab(index) === 'description' ? 'bg-primary/10 text-primary border-b-2 border-primary font-bold' : 'text-base-content/60 hover:text-base-content'}`}
                      onClick={() => setCardTab(index, 'description')}
                    >
                      Description
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 text-xs font-semibold rounded-t-lg transition-colors ${getCardTab(index) === 'instructions' ? 'bg-primary/10 text-primary border-b-2 border-primary font-bold' : 'text-base-content/60 hover:text-base-content'}`}
                      onClick={() => setCardTab(index, 'instructions')}
                    >
                      Instructions
                    </button>
                  </div>

                  {getCardTab(index) === 'description' && (
                    <textarea
                      value={char.description}
                      onChange={(e) => handleCharacterChange(index, 'description', e.target.value)}
                      placeholder="Describe character appearance, personality, role..."
                      rows={10}
                      className="textarea textarea-bordered text-xs leading-relaxed w-full flex-1 bg-base-100/50 focus:bg-base-100 rounded-xl resize-none min-h-[300px]"
                    />
                  )}

                  {getCardTab(index) === 'instructions' && (
                    <textarea
                      value={char.instructions || ''}
                      onChange={(e) => handleCharacterChange(index, 'instructions', e.target.value)}
                      placeholder="Character drawing instructions (to be defined)..."
                      rows={10}
                      className="textarea textarea-bordered text-xs leading-relaxed w-full flex-1 bg-base-100/50 focus:bg-base-100 rounded-xl resize-none min-h-[300px]"
                    />
                  )}

                  {getCardTab(index) === 'picture' && (
                    <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-base-content/20 rounded-xl p-4 text-center text-xs text-base-content/50 bg-base-100/30">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mb-2 opacity-40">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                      <span>Character Picture (To be defined)</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Form>
    </div>
  );
}
