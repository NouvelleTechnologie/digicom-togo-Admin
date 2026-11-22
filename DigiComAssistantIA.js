import { useEffect, useRef, useState } from 'react';
import { jsx as h, jsxs as hs } from 'react/jsx-runtime';
import { ameliorerImageIA, genererDescriptionIA } from './aiClient.js';

const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
export default function DigiComAssistantIA({
  nom = '', prix = '', categorie = '', description = '',
  onDescriptionChange = () => {}, onImageReady = () => {}
}) {
  const [details, setDetails] = useState('');
  const [busyText, setBusyText] = useState(false);
  const [busyImage, setBusyImage] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [errorImage, setErrorImage] = useState('');
  const [notice, setNotice] = useState('');
  const [originalFile, setOriginalFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [resultFile, setResultFile] = useState(null);
  const [imagePrompt, setImagePrompt] = useState('Améliorer l’éclairage et la netteté. Préserver strictement le produit réel, sa forme, sa couleur, son logo et ses détails. Ne rien ajouter ni retirer.');
  const inputRef = useRef(null);
  useEffect(() => () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [originalUrl, resultUrl]);

  function choisirPhoto(event) {
    const file = event.target.files?.[0];
    setErrorImage(''); setNotice('');
    if (!file) return;
    if (!file.type?.startsWith('image/')) { setErrorImage('Sélectionnez un fichier image.'); event.target.value = ''; return; }
    if (file.size > MAX_PHOTO_BYTES) { setErrorImage('La photo dépasse 12 Mo. Choisissez une photo plus légère.'); event.target.value = ''; return; }
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setOriginalFile(file); setOriginalUrl(URL.createObjectURL(file));
    setResultFile(null); setResultUrl('');
    event.target.value = '';
  }
  async function genererTexte() {
    setErrorText(''); setNotice('');
    if (!String(nom).trim()) { setErrorText('Saisissez d’abord le nom du produit.'); return; }
    setBusyText(true);
    try {
      const result = await genererDescriptionIA({ nom, prix, categorie, details });
      if (!result.description?.trim()) throw new Error('Aucune description reçue.');
      onDescriptionChange(result.description.trim());
      setNotice('Description proposée. Relisez-la avant de l’enregistrer.');
    } catch (error) { setErrorText(error?.message || 'Impossible de générer la description.'); }
    finally { setBusyText(false); }
  }
  async function ameliorerPhoto() {
    setErrorImage(''); setNotice('');
    if (!originalFile) { setErrorImage('Choisissez d’abord une photo du produit.'); return; }
    setBusyImage(true);
    try {
      const result = await ameliorerImageIA({ file: originalFile, prompt: imagePrompt });
      if (!result.imageDataUrl) throw new Error('Le service n’a pas retourné d’image.');
      const blob = await (await fetch(result.imageDataUrl)).blob();
      const file = new File([blob], `digicom-amelioree-${Date.now()}.png`, { type: blob.type || 'image/png' });
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultFile(file); setResultUrl(URL.createObjectURL(file));
      setNotice('Aperçu prêt. Comparez les images avant de choisir.');
    } catch (error) { setErrorImage(error?.message || 'Impossible d’améliorer cette photo.'); }
    finally { setBusyImage(false); }
  }
  function accepterPhoto() {
    if (!resultFile || !resultUrl) return;
    onImageReady(resultFile, resultUrl);
    setNotice('Photo ajoutée au formulaire. Enregistrez ensuite le produit.');
  }
  return hs('section', { className: 'digicom-ai', 'aria-label': 'Assistant IA DigiCom', children: [
    hs('header', { className: 'digicom-ai__header', children: [
      h('span', { className: 'digicom-ai__spark', 'aria-hidden': true, children: '✦' }),
      hs('div', { children: [h('h3', { children: 'Assistant IA DigiCom' }), h('p', { children: 'Préparez votre fiche produit sans quitter l’espace vendeur.' })] })
    ]}),
    hs('section', { className: 'digicom-ai__section', children: [
      h('h4', { children: '✍️ Description du produit' }),
      h('p', { className: 'digicom-ai__hint', children: 'L’IA utilise les informations fournies. Vérifiez le texte avant publication.' }),
      h('label', { htmlFor: 'digicom-ai-details', children: 'Informations confirmées (facultatif)' }),
      h('textarea', { id: 'digicom-ai-details', rows: 3, maxLength: 1200, value: details, onChange: e => setDetails(e.target.value), placeholder: 'Couleur, taille, état neuf ou occasion, contenu du paquet…' }),
      h('button', { type: 'button', className: 'digicom-ai__button', onClick: genererTexte, disabled: busyText, children: busyText ? 'Génération…' : 'Générer la description' }),
      errorText && h('p', { className: 'digicom-ai__error', role: 'alert', children: errorText })
    ]}),
    hs('section', { className: 'digicom-ai__section', children: [
      h('h4', { children: '🖼️ Amélioration de photo' }),
      h('p', { className: 'digicom-ai__hint', children: 'La photo originale n’est pas remplacée sans votre validation.' }),
      h('input', { ref: inputRef, type: 'file', accept: 'image/png,image/jpeg,image/webp', onChange: choisirPhoto }),
      h('label', { htmlFor: 'digicom-ai-prompt', children: 'Consigne (facultatif)' }),
      h('textarea', { id: 'digicom-ai-prompt', rows: 2, maxLength: 700, value: imagePrompt, onChange: e => setImagePrompt(e.target.value) }),
      h('button', { type: 'button', className: 'digicom-ai__button', onClick: ameliorerPhoto, disabled: busyImage || !originalFile, children: busyImage ? 'Amélioration en cours…' : 'Améliorer la photo' }),
      (originalUrl || resultUrl) && hs('div', { className: 'digicom-ai__compare', children: [
        originalUrl && hs('div', { children: [h('b', { children: 'Originale' }), h('img', { src: originalUrl, alt: 'Photo originale du produit' })] }),
        resultUrl && hs('div', { children: [h('b', { children: 'Résultat IA' }), h('img', { src: resultUrl, alt: 'Photo proposée par l’IA' })] })
      ]}),
      resultFile && h('button', { type: 'button', className: 'digicom-ai__button digicom-ai__button--accept', onClick: accepterPhoto, children: 'Utiliser cette photo' }),
      errorImage && h('p', { className: 'digicom-ai__error', role: 'alert', children: errorImage })
    ]}),
    notice && h('p', { className: 'digicom-ai__notice', role: 'status', children: notice })
  ]});
}
