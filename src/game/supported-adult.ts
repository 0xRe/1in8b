export const SUPPORTED_ROLES=['cleaner','warehouse','cook','shop','artisan','factory'] as const;
export type SupportedRole=typeof SUPPORTED_ROLES[number]|'vendor'|'farm';
export type SupportedAdultChoice={kind:'shelteredWork'|'dayActivities'|'home';formal:false}|{kind:'supportedJob'|'familyShop'|'familyFarm';role:SupportedRole;formal:boolean};
/** Source ddAdult; the13% employment draw follows a failed25% workshop draw. */
export function chooseSupportedAdult(c:{level:2|3;rich:boolean;urban:boolean},draw:()=>number):SupportedAdultChoice {
 if(c.level===2&&c.rich&&draw()<.25)return {kind:'shelteredWork',formal:false};
 if(c.level===2&&draw()<(c.rich?.13:.27))return {kind:c.rich?'supportedJob':c.urban?'familyShop':'familyFarm',role:c.rich?SUPPORTED_ROLES[Math.min(5,Math.floor(draw()*6))]:c.urban?'vendor':'farm',formal:c.rich};
 return {kind:c.rich?'dayActivities':'home',formal:false};
}
export const supportedRoleLow:Record<SupportedRole,number>={cleaner:.06,warehouse:.22,cook:.15,shop:.25,artisan:.15,factory:.25,vendor:.08,farm:.03};
