# Maquettes 3D

Déposez ici votre maquette exportée depuis **Revit** ou votre **scan 3D**.

- Format attendu : `.glb` (recommandé) ou `.gltf`
- Nom par défaut chargé par le site : **`maquette.glb`**

## Exporter depuis Revit vers .glb
1. Dans Revit, exportez en **FBX** ou **OBJ** (ou utilisez le plug-in « 3D Repo » / « Twinmotion »).
2. Convertissez en `.glb` :
   - en ligne avec [gltf.report](https://gltf.report) ou [Blender](https://www.blender.org) (File → Import, puis File → Export → glTF Binary `.glb`),
   - ou via la commande `obj2gltf` / `FBX2glTF`.
3. Allégez si besoin avec [`gltf-transform`](https://gltf-transform.dev) : `gltf-transform optimize in.glb out.glb`.
4. Placez le fichier ici sous le nom `maquette.glb`.

Pour utiliser plusieurs maquettes, changez l'attribut `data-model` du
conteneur `#model-viewer` dans `index.html`
(ex. `data-model="models/villa-belvedere.glb"`).

Tant qu'aucun fichier n'est présent, une **maquette de démonstration**
est affichée automatiquement.
