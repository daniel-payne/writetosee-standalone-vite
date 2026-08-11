import { useState, useEffect, useRef, useCallback, type HTMLAttributes, type PropsWithChildren } from "react";
import { Form, useLoaderData, useActionData, useNavigation, useBlocker, useFetcher } from "react-router-dom";
import { useLocalState } from "@keldan-systems/state-mutex";
import { useLiveQuery } from "dexie-react-hooks";
import { processDb } from "@/data/process/db";
import { analyzeCharacterStory, analyzeCharacterImage } from "@/data/process/saveCharacters";
import type { Character } from "@/data/process/TYPES";
import { writeFile } from "@/data/storage/fileStorage";
import ImageCropModal from "@/components/ImageCropModal";

type CharactersProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Characters({
  ...rest
}: PropsWithChildren<CharactersProps>) {
  const loaderData = useLoaderData() as any;
  const actionData = useActionData() as any;
  const navigation = useNavigation();
  const fetcher = useFetcher();

  const liveCharacters = useLiveQuery(() => processDb.characters.toArray());
  const [savedCharacters] = useLocalState<Character[]>('characters-data', []);
  const [charactersHash] = useLocalState<string>('characters-hash', '');

  const [characterList, setCharacterList] = useState<any[]>(savedCharacters || []);
  const [availableImages, setAvailableImages] = useState<{ name: string; url: string; lastModified: number }[]>(
    loaderData?.images || []
  );

  const [cardTabs, setCardTabs] = useState<Record<number, 'description' | 'instructions' | 'picture'>>({});
  const [selectingImageIdx, setSelectingImageIdx] = useState<number | null>(null);
  const [editingModalCharIdx, setEditingModalCharIdx] = useState<number | null>(null);
  const [deletingCharIdx, setDeletingCharIdx] = useState<number | null>(null);
  const [analyzingStoryIdx, setAnalyzingStoryIdx] = useState<number | null>(null);
  const [analyzingImageIdx, setAnalyzingImageIdx] = useState<number | null>(null);
  const [cropModalCharIdx, setCropModalCharIdx] = useState<number | null>(null);
  const [imageSearchQuery, setImageSearchQuery] = useState<string>('');

  const hiddenFileInputRef = useRef<HTMLInputElement | null>(null);
  const activeUploadCharIdxRef = useRef<number | null>(null);

  const isExtracting = fetcher.state !== 'idle' || (navigation.state !== 'idle' && navigation.formData?.get('intent') === 'EXTRACT-CHARACTERS');

  // Update availableImages if loaderData changes
  useEffect(() => {
    if (loaderData?.images) {
      setAvailableImages(loaderData.images);
    }
  }, [loaderData?.images]);

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
    if (liveCharacters && liveCharacters.length > 0 && !isDirtyRef.current) {
      setCharacterList(liveCharacters);
    } else if (savedCharacters && savedCharacters.length > 0 && characterList.length === 0) {
      setCharacterList(savedCharacters);
    }
  }, [liveCharacters, savedCharacters]);

  // Check dirty state
  const isDirty = JSON.stringify(characterList) !== JSON.stringify(savedCharacters || []);
  const isDirtyRef = useRef(isDirty);
  const navigationStateRef = useRef(navigation.state);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    navigationStateRef.current = navigation.state;
  }, [navigation.state]);

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

  const getCardTab = (index: number) => cardTabs[index] || 'picture';
  const setCardTab = (index: number, tab: 'description' | 'instructions' | 'picture') => {
    setCardTabs(prev => ({ ...prev, [index]: tab }));
  };

  const handleCharacterChange = (index: number, field: string, value: any) => {
    setCharacterList(prev => {
      const updated = [...prev];
      if (field === 'image') {
        updated[index] = {
          ...updated[index],
          image: value,
          reference_url: value,
          referenceUrl: value,
          cropBox: undefined,
          crop_box: undefined,
          crop_x: undefined,
          crop_y: undefined,
          crop_width: undefined,
          crop_height: undefined
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
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

  const getImageSrc = useCallback((imagePath?: string) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('blob:') || imagePath.startsWith('data:') || imagePath.startsWith('http')) {
      return imagePath;
    }
    const cleanPath = imagePath.trim();
    const found = availableImages.find(
      img =>
        img.name === cleanPath ||
        img.name === `images/${cleanPath}` ||
        cleanPath === `images/${img.name}` ||
        img.name.endsWith(cleanPath)
    );
    return found ? found.url : null;
  }, [availableImages]);

  const triggerUploadForCharacter = (index: number | null) => {
    if (index === null) return;
    activeUploadCharIdxRef.current = index;
    if (hiddenFileInputRef.current) {
      hiddenFileInputRef.current.click();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const targetIdx = activeUploadCharIdxRef.current;
    if (!file || targetIdx === null) return;

    const ext = file.name.split('.').pop() || 'png';
    const charName = characterList[targetIdx]?.name || `character_${targetIdx + 1}`;
    const sanitizedCharName = charName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `images/character_${sanitizedCharName}_${Date.now()}.${ext}`;

    try {
      await writeFile(fileName, file);
      const objectUrl = URL.createObjectURL(file);

      setAvailableImages(prev => [
        { name: fileName, url: objectUrl, lastModified: Date.now() },
        ...prev
      ]);

      handleCharacterChange(targetIdx, 'image', fileName);
      if (selectingImageIdx !== null) {
        setSelectingImageIdx(null);
      }
    } catch (err: any) {
      console.error('Failed to upload character image:', err);
      alert(`Failed to save image to storage: ${err.message || String(err)}`);
    } finally {
      activeUploadCharIdxRef.current = null;
    }
  };

  const handleAnalyzeStory = async (index: number) => {
    const char = characterList[index];
    if (!char) return;

    setAnalyzingStoryIdx(index);
    try {
      const { description } = await analyzeCharacterStory(char.name, char.description);
      if (description) {
        handleCharacterChange(index, 'description', description);
        setCardTab(index, 'description');
      }
    } catch (err: any) {
      console.error('Failed to analyze story for character:', err);
      alert(`Failed to analyze story: ${err.message || String(err)}`);
    } finally {
      setAnalyzingStoryIdx(null);
    }
  };

  const handleAnalyzeImage = async (index: number) => {
    const char = characterList[index];
    if (!char) return;
    if (!char.image) {
      alert('Please select a picture for this character before analyzing.');
      return;
    }

    setAnalyzingImageIdx(index);
    try {
      const { instructions } = await analyzeCharacterImage(char.image, char.name, char.cropBox);
      if (instructions) {
        handleCharacterChange(index, 'instructions', instructions);
        setCardTab(index, 'instructions');
      }
    } catch (err: any) {
      console.error('Failed to analyze character image:', err);
      alert(`Failed to analyze image: ${err.message || String(err)}`);
    } finally {
      setAnalyzingImageIdx(null);
    }
  };

  const filteredImages = availableImages.filter(img =>
    !imageSearchQuery || img.name.toLowerCase().includes(imageSearchQuery.toLowerCase())
  );

  return (
    <div {...rest} className={`p-4 w-full h-full overflow-auto flex flex-col ${rest.className || ''}`}>
      {/* Hidden file input for uploading custom character images */}
      <input
        type="file"
        ref={hiddenFileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

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
            {characterList.map((char, index) => {
              const imageSrc = getImageSrc(char.image);
              const isBoxSelected = Boolean(char.cropBox && char.cropBox.width > 0 && char.cropBox.height > 0);
              const isImageSelected = Boolean(char.image && char.image.trim());

              const selectBtnClass = !isImageSelected
                ? 'btn btn-xs btn-primary bg-primary text-primary-content rounded-lg gap-1 shadow-sm'
                : 'btn btn-xs btn-outline btn-primary rounded-lg gap-1';

              const boxBtnClass = (isImageSelected && !isBoxSelected)
                ? 'btn btn-xs btn-primary bg-primary text-primary-content rounded-lg gap-1 shadow-sm'
                : 'btn btn-xs btn-outline btn-primary rounded-lg gap-1';

              const analyzeBtnClass = (isImageSelected && isBoxSelected)
                ? 'btn btn-xs btn-primary bg-primary text-primary-content rounded-lg gap-1 shadow-sm'
                : 'btn btn-xs btn-outline btn-primary rounded-lg gap-1';

              return (
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

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Analyze Story Button (Top) */}
                      <button
                        type="button"
                        onClick={() => handleAnalyzeStory(index)}
                        disabled={analyzingStoryIdx === index}
                        title="Analyze story text to refine character description"
                        className="btn btn-xs btn-ghost text-primary/80 hover:text-primary hover:bg-primary/10 rounded-lg p-1.5"
                      >
                        {analyzingStoryIdx === index ? (
                          <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
                          </svg>
                        )}
                      </button>

                      {/* Edit Character in Modal Button */}
                      <button
                        type="button"
                        onClick={() => setEditingModalCharIdx(index)}
                        title="Edit Character in Modal Popup"
                        className="btn btn-xs btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200 rounded-lg p-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                      </button>

                      {/* Remove Character Button */}
                      <button
                        type="button"
                        onClick={() => setDeletingCharIdx(index)}
                        title="Remove Character"
                        className="btn btn-xs btn-ghost text-error/70 hover:text-error hover:bg-error/10 rounded-lg p-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
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
                      imageSrc ? (
                        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-between bg-base-100/40 border border-base-content/10 rounded-xl p-3 relative group">
                          <div
                            onDoubleClick={() => setCropModalCharIdx(index)}
                            title="Double click to enlarge"
                            className="flex-1 w-full flex items-center justify-center overflow-hidden rounded-lg bg-base-200/50 min-h-[220px] cursor-pointer p-1"
                          >
                            <div className="relative inline-block max-h-[260px] max-w-full">
                              <img
                                src={imageSrc}
                                alt={char.name}
                                className="max-h-[260px] w-auto max-w-full object-contain rounded-lg shadow-sm block"
                              />
                              {char.cropBox && char.cropBox.width > 0 && (
                                <>
                                  {/* Dark overlay outside the crop box using SVG mask */}
                                  <svg
                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                  >
                                    <defs>
                                      <mask id={`crop-mask-${index}`}>
                                        {/* White = visible (dimmed area) */}
                                        <rect x="0" y="0" width="100" height="100" fill="white" />
                                        {/* Black = hidden (clear cutout for the character) */}
                                        <rect
                                          x={char.cropBox.x * 100}
                                          y={char.cropBox.y * 100}
                                          width={char.cropBox.width * 100}
                                          height={char.cropBox.height * 100}
                                          fill="black"
                                        />
                                      </mask>
                                    </defs>
                                    <rect
                                      x="0" y="0" width="100" height="100"
                                      fill="rgba(0,0,0,0.5)"
                                      mask={`url(#crop-mask-${index})`}
                                    />
                                  </svg>
                                  {/* Border around the crop box */}
                                  <div
                                    className="absolute border-2 border-primary shadow-[0_0_10px_rgba(59,130,246,0.6)] rounded pointer-events-none"
                                    style={{
                                      left: `${char.cropBox.x * 100}%`,
                                      top: `${char.cropBox.y * 100}%`,
                                      width: `${char.cropBox.width * 100}%`,
                                      height: `${char.cropBox.height * 100}%`,
                                    }}
                                  >
                                    <span className="absolute -top-4 left-0 bg-primary text-primary-content text-[9px] font-bold px-1 rounded shadow-sm truncate max-w-[120px]">
                                      {char.name}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="w-full mt-3 flex items-center justify-between gap-2 border-t border-base-content/10 pt-2 shrink-0">
                            <div className="text-[11px] font-mono text-base-content/60 truncate max-w-[120px]" title={char.image}>
                              {char.image?.replace(/^images\//, '')}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* 1. Select */}
                              <button
                                type="button"
                                onClick={() => setSelectingImageIdx(index)}
                                className={selectBtnClass}
                                title="Select another image from storage"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                                Select
                              </button>
                              {/* 2. Isolate Box / Edit Box */}
                              <button
                                type="button"
                                onClick={() => setCropModalCharIdx(index)}
                                className={boxBtnClass}
                                title="Expand image & draw bounding box around character"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5" />
                                </svg>
                                {isBoxSelected ? 'Edit Box' : 'Isolate Box'}
                              </button>
                              {/* 3. Analyze Image */}
                              <button
                                type="button"
                                onClick={() => handleAnalyzeImage(index)}
                                disabled={analyzingImageIdx === index}
                                className={analyzeBtnClass}
                                title={isBoxSelected ? "Analyze isolated character box with LLM Vision" : "Analyze picture with LLM Vision to extract drawing instructions"}
                              >
                                {analyzingImageIdx === index ? (
                                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                  </svg>
                                )}
                                Analyze Image
                              </button>
                              {/* 4. Delete / Remove picture */}
                              <button
                                type="button"
                                onClick={() => handleCharacterChange(index, 'image', '')}
                                className="btn btn-xs btn-ghost text-error/70 hover:text-error hover:bg-error/10 rounded-lg p-1"
                                title="Remove picture"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-base-content/20 rounded-xl p-6 text-center text-xs text-base-content/60 bg-base-100/30 gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-base-content mb-1">No Picture Selected</p>
                            <p className="text-xs text-base-content/50 max-w-xs">
                              Pick an image from storage that illustrates this character, or upload a custom picture.
                            </p>
                          </div>
                          <div className="flex flex-wrap justify-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => setSelectingImageIdx(index)}
                              className="btn btn-sm btn-primary shadow-sm rounded-xl gap-1.5"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                              </svg>
                              Select from Images
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerUploadForCharacter(index)}
                              className="btn btn-sm btn-outline rounded-xl gap-1.5 hidden"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                              </svg>
                              Upload Image
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Form>

      {/* Modal for selecting an image from image storage */}
      {selectingImageIdx !== null && (
        <div className="modal modal-open flex items-center justify-center z-50 p-4 fixed inset-0">
          <div className="modal-box max-w-4xl w-full bg-base-100 border border-base-content/10 shadow-2xl p-6 rounded-2xl flex flex-col gap-4 text-left max-h-[85vh] relative z-10">
            <div className="flex justify-between items-center border-b border-base-content/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                  <span>Select Picture for</span>
                  <span className="text-primary font-extrabold">{characterList[selectingImageIdx]?.name || `Character ${selectingImageIdx + 1}`}</span>
                </h3>
                <p className="text-xs text-base-content/60 mt-0.5">
                  Choose an image from storage that illustrates this character.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectingImageIdx(null);
                  setImageSearchQuery('');
                }}
                className="btn btn-sm btn-circle btn-ghost text-base-content/60 hover:text-base-content"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={imageSearchQuery}
                onChange={(e) => setImageSearchQuery(e.target.value)}
                placeholder="Filter images by filename..."
                className="input input-sm input-bordered w-full max-w-xs rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={() => triggerUploadForCharacter(selectingImageIdx)}
                className="btn btn-sm btn-outline rounded-xl text-xs gap-1 hidden"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                Upload New Image
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto p-1">
              {filteredImages.length === 0 ? (
                <div className="p-12 text-center text-xs text-base-content/50 bg-base-200/30 rounded-xl border border-dashed border-base-content/10">
                  {availableImages.length === 0 ? (
                    <p>No images found in storage yet. Generate images or upload one above.</p>
                  ) : (
                    <p>No images matching "{imageSearchQuery}".</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredImages.map((img) => {
                    const selectedChar = characterList[selectingImageIdx];
                    const isSelected = Boolean(
                      selectedChar?.image &&
                      (selectedChar.image === img.name ||
                        selectedChar.image === img.name.replace(/^images\//, '') ||
                        img.name.endsWith(selectedChar.image))
                    );

                    return (
                      <div
                        key={img.name}
                        onClick={() => {
                          handleCharacterChange(selectingImageIdx, 'image', img.name);
                          setSelectingImageIdx(null);
                          setImageSearchQuery('');
                        }}
                        className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-150 ${isSelected
                          ? 'border-primary ring-2 ring-primary/40 shadow-lg scale-[1.02]'
                          : 'border-base-content/10 hover:border-primary/50 hover:shadow-md'
                          }`}
                      >
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                          <p className="text-[10px] font-mono text-white truncate" title={img.name}>
                            {img.name.replace(/^images\//, '')}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-content rounded-full p-1 shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-action flex justify-between items-center border-t border-base-content/10 pt-3 mt-0">
              <span className="text-xs text-base-content/50 font-mono">
                {filteredImages.length} image(s) available
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectingImageIdx(null);
                  setImageSearchQuery('');
                }}
                className="btn btn-sm btn-ghost rounded-xl px-5"
              >
                Cancel
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/50 backdrop-blur-xs fixed inset-0 cursor-pointer"
            onClick={() => {
              setSelectingImageIdx(null);
              setImageSearchQuery('');
            }}
          ></div>
        </div>
      )}

      {/* Small Modal Popup for Editing Character Details */}
      {editingModalCharIdx !== null && characterList[editingModalCharIdx] && (
        <div className="modal modal-open flex items-center justify-center z-40 p-4 fixed inset-0">
          <div className="modal-box max-w-lg w-full bg-base-100 border border-base-content/10 shadow-2xl p-6 rounded-2xl flex flex-col gap-4 text-left max-h-[90vh] relative z-10">
            <div className="flex justify-between items-center border-b border-base-content/10 pb-3">
              <h3 className="text-base font-bold text-base-content flex items-center gap-2">
                <span>Edit Character</span>
                <span className="text-primary font-extrabold">({characterList[editingModalCharIdx].name || 'Unnamed'})</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingModalCharIdx(null)}
                className="btn btn-sm btn-circle btn-ghost text-base-content/60 hover:text-base-content"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-auto p-1">
              {/* Name input */}
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Character Name</span>
                </label>
                <input
                  type="text"
                  value={characterList[editingModalCharIdx].name}
                  onChange={(e) => handleCharacterChange(editingModalCharIdx, 'name', e.target.value)}
                  placeholder="e.g. Mrs Brown"
                  className="input input-sm input-bordered rounded-xl w-full text-xs font-medium"
                />
              </div>

              {/* Picture Selection */}
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Character Picture</span>
                </label>
                <div className="flex items-center gap-3 bg-base-200/40 p-2.5 rounded-xl border border-base-content/10">
                  <div
                    onDoubleClick={() => {
                      if (characterList[editingModalCharIdx].image) {
                        setCropModalCharIdx(editingModalCharIdx);
                      }
                    }}
                    title={characterList[editingModalCharIdx].image ? "Double click to enlarge" : undefined}
                    className={`w-12 h-12 rounded-lg overflow-hidden bg-primary/20 text-primary flex items-center justify-center font-bold text-base shrink-0 border border-base-content/10 ${characterList[editingModalCharIdx].image ? 'cursor-pointer hover:opacity-90' : ''}`}
                  >
                    {getImageSrc(characterList[editingModalCharIdx].image) ? (
                      <img
                        src={getImageSrc(characterList[editingModalCharIdx].image)!}
                        alt={characterList[editingModalCharIdx].name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      characterList[editingModalCharIdx].name ? characterList[editingModalCharIdx].name.charAt(0).toUpperCase() : '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <p className="font-mono text-[11px] text-base-content/70 truncate">
                        {characterList[editingModalCharIdx].image?.replace(/^images\//, '') || 'No picture selected'}
                      </p>
                      {characterList[editingModalCharIdx].cropBox && (
                        <span className="badge badge-xs badge-primary font-mono text-[9px] shrink-0">
                          Isolated Box
                        </span>
                      )}
                    </div>
                    {(() => {
                      const modalChar = characterList[editingModalCharIdx];
                      const modalHasImage = Boolean(modalChar?.image && modalChar.image.trim());
                      const modalHasBox = Boolean(modalChar?.cropBox && modalChar.cropBox.width > 0 && modalChar.cropBox.height > 0);

                      const modalSelectClass = !modalHasImage
                        ? 'btn btn-xs btn-primary bg-primary text-primary-content rounded-lg text-[11px] gap-1 shadow-sm'
                        : 'btn btn-xs btn-outline btn-primary rounded-lg text-[11px] gap-1';

                      const modalBoxClass = (modalHasImage && !modalHasBox)
                        ? 'btn btn-xs btn-primary bg-primary text-primary-content rounded-lg text-[11px] gap-1 shadow-sm'
                        : 'btn btn-xs btn-outline btn-primary rounded-lg text-[11px] gap-1';

                      const modalAnalyzeClass = (modalHasImage && modalHasBox)
                        ? 'btn btn-xs btn-primary bg-primary text-primary-content rounded-lg text-[11px] gap-1 shadow-sm'
                        : 'btn btn-xs btn-outline btn-primary rounded-lg text-[11px] gap-1';

                      return (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <button
                            type="button"
                            onClick={() => setSelectingImageIdx(editingModalCharIdx)}
                            className={modalSelectClass}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                            Select
                          </button>
                          {modalHasImage && (
                            <button
                              type="button"
                              onClick={() => setCropModalCharIdx(editingModalCharIdx)}
                              className={modalBoxClass}
                              title="Expand image & draw bounding box around character"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5" />
                              </svg>
                              {modalHasBox ? 'Edit Box' : 'Isolate Box'}
                            </button>
                          )}
                          {modalHasImage && (
                            <button
                              type="button"
                              onClick={() => handleAnalyzeImage(editingModalCharIdx)}
                              disabled={analyzingImageIdx === editingModalCharIdx}
                              className={modalAnalyzeClass}
                            >
                              {analyzingImageIdx === editingModalCharIdx ? (
                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                              )}
                              Analyze
                            </button>
                          )}
                          {modalHasImage && (
                            <button
                              type="button"
                              onClick={() => handleCharacterChange(editingModalCharIdx, 'image', '')}
                              className="btn btn-xs btn-ghost text-error rounded-lg text-[11px]"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Description</span>
                </label>
                <textarea
                  value={characterList[editingModalCharIdx].description}
                  onChange={(e) => handleCharacterChange(editingModalCharIdx, 'description', e.target.value)}
                  placeholder="Describe character appearance, personality, role..."
                  rows={4}
                  className="textarea textarea-bordered text-xs leading-relaxed w-full bg-base-100/50 rounded-xl resize-y"
                />
              </div>

              {/* Instructions */}
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Drawing Instructions</span>
                </label>
                <textarea
                  value={characterList[editingModalCharIdx].instructions || ''}
                  onChange={(e) => handleCharacterChange(editingModalCharIdx, 'instructions', e.target.value)}
                  placeholder="Character drawing instructions..."
                  rows={4}
                  className="textarea textarea-bordered text-xs leading-relaxed w-full bg-base-100/50 rounded-xl resize-y"
                />
              </div>
            </div>

            <div className="modal-action flex justify-between items-center border-t border-base-content/10 pt-3 mt-0">
              <button
                type="button"
                onClick={() => handleAnalyzeStory(editingModalCharIdx)}
                disabled={analyzingStoryIdx === editingModalCharIdx}
                title="Analyze story text to refine character description"
                className="btn btn-sm btn-ghost text-primary rounded-xl text-xs gap-1.5"
              >
                {analyzingStoryIdx === editingModalCharIdx ? (
                  <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
                  </svg>
                )}
                Analyze Story
              </button>

              <button
                type="button"
                onClick={() => setEditingModalCharIdx(null)}
                className="btn btn-sm btn-primary rounded-xl px-5"
              >
                Done
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/50 backdrop-blur-xs fixed inset-0 cursor-pointer"
            onClick={() => setEditingModalCharIdx(null)}
          ></div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCharIdx !== null && characterList[deletingCharIdx] && (
        <div className="modal modal-open flex items-center justify-center z-50 p-4 fixed inset-0">
          <div className="modal-box max-w-sm w-full bg-base-100 border border-base-content/10 shadow-2xl p-6 rounded-2xl flex flex-col gap-4 text-center relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-base-content">Delete Character?</h3>
              <p className="text-xs text-base-content/70 mt-1">
                Are you sure you want to delete <strong className="text-base-content font-semibold">"{characterList[deletingCharIdx].name || `Character ${deletingCharIdx + 1}`}"</strong>?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => setDeletingCharIdx(null)}
                className="btn btn-sm btn-ghost rounded-xl flex-1 border border-base-content/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemoveCharacter(deletingCharIdx);
                  setDeletingCharIdx(null);
                }}
                className="btn btn-sm btn-error text-error-content rounded-xl flex-1 shadow-md shadow-error/20"
              >
                Delete
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/50 backdrop-blur-xs fixed inset-0 cursor-pointer"
            onClick={() => setDeletingCharIdx(null)}
          ></div>
        </div>
      )}

      {/* Image Crop Box Modal */}
      {cropModalCharIdx !== null && characterList[cropModalCharIdx] && (
        <ImageCropModal
          isOpen={true}
          imageSrc={getImageSrc(characterList[cropModalCharIdx].image) || ''}
          characterName={characterList[cropModalCharIdx].name || `Character ${cropModalCharIdx + 1}`}
          initialCropBox={characterList[cropModalCharIdx].cropBox || null}
          onSave={(newCropBox) => {
            setCharacterList((prev) => {
              const updated = [...prev];
              if (newCropBox) {
                updated[cropModalCharIdx] = { ...updated[cropModalCharIdx], cropBox: newCropBox };
              } else {
                const copy = { ...updated[cropModalCharIdx] };
                delete copy.cropBox;
                updated[cropModalCharIdx] = copy;
              }
              return updated;
            });
          }}
          onClose={() => setCropModalCharIdx(null)}
          onAnalyze={() => {
            const targetIdx = cropModalCharIdx;
            setCropModalCharIdx(null);
            if (targetIdx !== null) {
              handleAnalyzeImage(targetIdx);
            }
          }}
          isAnalyzing={analyzingImageIdx === cropModalCharIdx}
        />
      )}
    </div>
  );
}

