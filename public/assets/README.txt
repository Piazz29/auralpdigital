Asset 3D della sezione "Il Percorso" (Chi siamo) — usati da JourneyStepAssets.jsx.

step1.glb  Libri (Università)            — origine: step1.glb (Desktop/asset)
step2.glb  Computer (Prima riga di codice)— origine: Old Computer V3.fbx + texture,
                                            convertito con assimpjs, schermo reso
                                            emissivo (Screen_Emit.png)
step3.glb  Logo AuralpDigital             — origine: step3.glb; il materiale è
                                            sostituito a runtime col blu glossy brand
step4.glb  Lampadina (Domani)             — origine: step4.glb; materiale brand a runtime

Tutti ottimizzati con: npx @gltf-transform/cli optimize <in> <out>
  --compress meshopt --texture-compress webp --texture-size 1024
(6.6MB sorgenti → ~0.58MB totali; decoder meshopt incluso in three via drei).

Per sostituire un asset: rigenerare il .glb con lo stesso comando e sovrascrivere.
Orientamento/scala/posizione si tarano in ASSETS dentro JourneyStepAssets.jsx.
