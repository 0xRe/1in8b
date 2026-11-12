import type {AlbumScene} from './room-data';
import {pixelScene,sceneDataUrl} from './pixel-art';
/** Public illustrations need only bounded fictional appearance data, never the private save. */
export function albumPicture(scene:AlbumScene):string|undefined {
 if(!scene.scene)return undefined;
 return sceneDataUrl(pixelScene({seed:scene.scene.seed,age:scene.age,sex:scene.scene.sex,birthYear:scene.year-scene.age,alive:true,residence:'urban',pets:[],stats:{job:'none'},family:{partner:null,marriageAge:null,children:[]}},undefined,scene.scene.kind));
}
