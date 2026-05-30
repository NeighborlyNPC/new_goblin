import * as mc from "@minecraft/server";

// ============================================================
// CONSTANTS
// ============================================================

const GOBLIN_ID = "loot:goblin";

const NAMETAG_MAP = {
    "Poppy":    0, "poppy":    0, "POPPY":    0,
    "Tristana": 1, "tristana": 1, "TRISTANA": 1,
    "Malvah":   2, "malvah":   2, "MALVAH":   2,
    "Smug":     3, "smug":     3, "SMUG":     3,
    "Gobu":     4, "gobu":     4, "GOBU":     4,
    "Jackie":   5, "jackie":   5, "JACKIE":   5,
    "test":     0, "TEST":     0
};

const SKIN_COUNT    = 10;
const EYE_COUNT     = 10;
const CLOTHES_COUNT = 10;
const HAIR_COUNT    = 16;

const WEAPON_UNARMED  = 0;
const WEAPON_SWORD    = 1;
const WEAPON_CROSSBOW = 2;
const WEAPON_MACE     = 3;
const WEAPON_SPEAR    = 4;

const WTEX_SWORD        = 0;
const WTEX_SWORD_GOLD   = 1;
const WTEX_AXE          = 2;
const WTEX_AXE_GOLD     = 3;
const WTEX_PICKAXE      = 4;
const WTEX_PICKAXE_GOLD = 5;
const WTEX_SPEAR        = 6;
const WTEX_SPEAR_GOLD   = 7;

// Iron weapons unarmed goblins can pick up
const UNARMED_PICKUP_MAP = {
    "minecraft:iron_sword":   { state: WEAPON_SWORD,    tex: WTEX_SWORD },
    "minecraft:iron_axe":     { state: WEAPON_SWORD,    tex: WTEX_AXE },
    "minecraft:iron_pickaxe": { state: WEAPON_SWORD,    tex: WTEX_PICKAXE },
    "minecraft:mace":         { state: WEAPON_MACE,     tex: 0 },
    "minecraft:crossbow":     { state: WEAPON_CROSSBOW, tex: 0 },
    "minecraft:iron_spear":   { state: WEAPON_SPEAR,    tex: WTEX_SPEAR }
};

// Weapon texture for spawn-assigned gold variants + iron fallbacks
const WEAPON_TEXTURE_MAP = {
    "minecraft:golden_sword":   WTEX_SWORD_GOLD,
    "minecraft:golden_axe":     WTEX_AXE_GOLD,
    "minecraft:golden_pickaxe": WTEX_PICKAXE_GOLD,
    "minecraft:golden_spear":   WTEX_SPEAR_GOLD,
    "minecraft:iron_sword":     WTEX_SWORD,
    "minecraft:iron_axe":       WTEX_AXE,
    "minecraft:iron_pickaxe":   WTEX_PICKAXE,
    "minecraft:iron_spear":     WTEX_SPEAR
};

const ATTACK_DURATION_TICKS = {
    [WEAPON_UNARMED]:  8,
    [WEAPON_SWORD]:   10,
    [WEAPON_MACE]:    14,
    [WEAPON_SPEAR]:   12
};

const TAME_CHANCES = {
    "minecraft:golden_carrot":          0.20,
    "minecraft:glistering_melon_slice": 0.20,
    "minecraft:golden_apple":           0.25,
    "minecraft:enchanted_golden_apple": 1.00
};

const GOLD_FOOD_ITEMS = new Set([
    "minecraft:golden_carrot",
    "minecraft:glistering_melon_slice",
    "minecraft:golden_apple",
    "minecraft:enchanted_golden_apple"
]);

const NORMAL_FOOD_ITEMS = new Set([
    "minecraft:apple",
    "minecraft:melon_slice",
    "minecraft:carrot"
]);

const FOOD_INDEX_MAP = {
    "minecraft:apple":                  0,
    "minecraft:melon_slice":            1,
    "minecraft:carrot":                 2,
    "minecraft:golden_apple":           3,
    "minecraft:glistering_melon_slice": 4,
    "minecraft:golden_carrot":          5
};

const AUTO_EAT_ORDER = [
    "minecraft:golden_apple",
    "minecraft:golden_carrot",
    "minecraft:glistering_melon_slice",
    "minecraft:apple",
    "minecraft:carrot",
    "minecraft:melon_slice"
];

const STAGE_EVENTS = [
    "loot:set_stage_0",
    "loot:set_stage_1",
    "loot:set_stage_2",
    "loot:set_stage_3"
];

const FLAT_HEAL     = 5;
const LOW_HP_THRESH = 8;

const DIGESTION_MAX   = 25.0;
const DIGESTION_RESET = 20.0;
const DIGESTION_TICK  = 1.0;
const DIGESTION_HIT   = 1.0;
const DIGESTION_RUB   = 4.0;

const IDLE_POSE_STAND = 0;
const IDLE_POSE_SIT   = 1;
const IDLE_POSE_REST  = 2;

const IDLE_TIMER_THRESHOLD = 15 * 20;
const BLINK_INTERVAL_MIN   = 5  * 20;
const BLINK_INTERVAL_MAX   = 10 * 20;
const BLINK_DURATION       = 13;

const GOLD_KEEP_ITEMS = new Set([
    "minecraft:gold_ingot", "minecraft:gold_nugget",
    "minecraft:golden_apple", "minecraft:enchanted_golden_apple",
    "minecraft:golden_carrot", "minecraft:glistering_melon_slice",
    "minecraft:golden_helmet", "minecraft:golden_chestplate",
    "minecraft:golden_leggings", "minecraft:golden_boots",
    "minecraft:golden_sword", "minecraft:golden_axe", "minecraft:golden_pickaxe"
]);

// ============================================================
// HELPERS
// ============================================================

function isGoblin(entity) { return entity?.typeId === GOBLIN_ID; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min)) + min; }

function safeSetProperty(entity, key, value) {
    try { entity.setProperty(key, value); }
    catch (e) { console.warn(`[GoblinScript] Failed to set ${key}: ${e}`); }
}

function safeGetProperty(entity, key) {
    try { return entity.getProperty(key); }
    catch (_) { return null; }
}

function triggerEvent(entity, event) {
    try { entity.triggerEvent(event); }
    catch (e) { console.warn(`[GoblinScript] Failed to trigger ${event}: ${e}`); }
}

function getMainhandItemId(entity) {
    try {
        const eq = entity.getComponent("minecraft:equippable");
        if (!eq) return null;
        const item = eq.getEquipment(mc.EquipmentSlot.Mainhand);
        return item ? item.typeId : null;
    } catch (_) { return null; }
}

function consumeMainhandItem(player) {
    try {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return;
        const item = eq.getEquipment(mc.EquipmentSlot.Mainhand);
        if (!item) return;
        if (item.amount > 1) {
            item.amount -= 1;
            eq.setEquipment(mc.EquipmentSlot.Mainhand, item);
        } else {
            eq.setEquipment(mc.EquipmentSlot.Mainhand, undefined);
        }
    } catch (_) {}
}

function getHealth(entity) {
    try {
        const h = entity.getComponent("minecraft:health");
        return h ? { current: h.currentValue, max: h.effectiveMax } : null;
    } catch (_) { return null; }
}

function healToMax(entity) {
    try {
        const h = entity.getComponent("minecraft:health");
        if (h) h.setCurrentValue(h.effectiveMax);
    } catch (_) {}
}

function healFlat(entity) {
    try {
        const h = entity.getComponent("minecraft:health");
        if (h) h.setCurrentValue(Math.min(h.currentValue + FLAT_HEAL, h.effectiveMax));
    } catch (_) {}
}

function getDigestion(goblin) {
    return safeGetProperty(goblin, "loot:digestion_timer") ?? DIGESTION_RESET;
}

function setDigestion(goblin, value) {
    safeSetProperty(goblin, "loot:digestion_timer",
        Math.max(0.0, Math.min(DIGESTION_MAX, value)));
}

function spawnParticleAbove(entity, particle) {
    try {
        const loc = { x: entity.location.x, y: entity.location.y + 1.8, z: entity.location.z };
        entity.dimension.spawnParticle(particle, loc);
    } catch (_) {}
}

// ============================================================
// PER-GOBLIN STATE
// ============================================================

const goblinInventory = new Map();
function getInventory(id) {
    if (!goblinInventory.has(id)) {
        goblinInventory.set(id, {
            honey: 0, golden_apple: 0, golden_carrot: 0, golden_melon: 0,
            apple: 0, carrot: 0, melon: 0
        });
    }
    return goblinInventory.get(id);
}

const goblinLoot = new Map();
function getLoot(id) {
    if (!goblinLoot.has(id)) goblinLoot.set(id, []);
    return goblinLoot.get(id);
}

function addLoot(id, itemId, amount = 1) {
    const loot = getLoot(id);
    const existing = loot.find(e => e.typeId === itemId);
    if (existing) existing.amount += amount;
    else loot.push({ typeId: itemId, amount });
}

function takeLoot(id, maxCount = 10) {
    const loot = getLoot(id);
    if (loot.length === 0) return [];
    const result = [];
    let remaining = maxCount;
    while (remaining > 0 && loot.length > 0) {
        const entry = loot[0];
        const take  = Math.min(entry.amount, remaining);
        result.push({ typeId: entry.typeId, amount: take });
        entry.amount -= take;
        remaining    -= take;
        if (entry.amount <= 0) loot.shift();
    }
    return result;
}

const idleTimers    = new Map();
const blinkTimers   = new Map();
const weaponLocked  = new Set();
const lockedGoblins = new Set();
const eatingGoblins = new Set();
const drinkingGoblins = new Set();
const poppingGoblins = new Set();
const attackingTimers = new Map();
const crossbowTimers = new Map();
const displayTimers = new Map();

// ============================================================
// LOCK / UNLOCK
// ============================================================

function lockGoblin(goblin, lockAnim) {
    const id = goblin.id;
    lockedGoblins.add(id);
    safeSetProperty(goblin, "loot:locked", true);
    safeSetProperty(goblin, "loot:lock_anim", lockAnim);
    triggerEvent(goblin, "loot:lock_movement");
}

function unlockGoblin(goblin) {
    const id = goblin.id;
    lockedGoblins.delete(id);
    safeSetProperty(goblin, "loot:locked", false);
    safeSetProperty(goblin, "loot:lock_anim", 0);
    triggerEvent(goblin, "loot:unlock_movement");
}

// ============================================================
// SPAWN & INITIALIZATION
// ============================================================

function onGoblinSpawn(entity) {
    const id = entity.id;
    
    // FORCE Skin Randomization
    const s = randInt(0, SKIN_COUNT);
    const e = randInt(0, EYE_COUNT);
    const c = randInt(0, CLOTHES_COUNT);
    const h = randInt(0, HAIR_COUNT);

    safeSetProperty(entity, "loot:skin_index", s);
    safeSetProperty(entity, "loot:eye_index", e);
    safeSetProperty(entity, "loot:clothes_index", c);
    safeSetProperty(entity, "loot:hair_index", h);
    safeSetProperty(entity, "loot:name", -1);

    const scale = 0.95 + Math.random() * 0.10;
    safeSetProperty(entity, "loot:scale", scale);
    try {
        const sc = entity.getComponent("minecraft:scale");
        if (sc) sc.value = scale;
    } catch (_) {}

    // Preserve BP default gold textures or sync mainhand
    const weaponState = safeGetProperty(entity, "loot:weapon_state");
    if (weaponState !== WEAPON_UNARMED && weaponState !== WEAPON_CROSSBOW && weaponState !== WEAPON_MACE) {
        mc.system.runTimeout(() => {
            try {
                if (!entity.isValid()) return;
                const itemId = getMainhandItemId(entity);
                const currentTex = safeGetProperty(entity, "loot:weapon_texture") ?? 0;
                
                // If mainhand has a valid item, use its texture mapping, otherwise keep BP default
                const tex = itemId !== null ? (WEAPON_TEXTURE_MAP[itemId] ?? currentTex) : currentTex;
                safeSetProperty(entity, "loot:weapon_texture", tex);
            } catch (_) {}
        }, 10);
    }

    blinkTimers.set(id, randInt(BLINK_INTERVAL_MIN, BLINK_INTERVAL_MAX));
    idleTimers.set(id, 0);
}

// ============================================================
// LOGIC SYSTEMS
// ============================================================

function checkNametag(entity) {
    const tag = entity.nameTag;
    if (!tag || tag.trim() === "") {
        if (safeGetProperty(entity, "loot:name") !== -1) safeSetProperty(entity, "loot:name", -1);
        return;
    }
    const trimmed = tag.trim();
    const index   = Object.prototype.hasOwnProperty.call(NAMETAG_MAP, trimmed) ? NAMETAG_MAP[trimmed] : -1;
    if (safeGetProperty(entity, "loot:name") !== index) safeSetProperty(entity, "loot:name", index);
}

function tryWeaponAdmire(goblin) {
    const id = goblin.id;
    if (weaponLocked.has(id)) return;
    if (lockedGoblins.has(id)) return;

    const weaponState = safeGetProperty(goblin, "loot:weapon_state");
    if (weaponState !== WEAPON_UNARMED) return;

    const itemId = getMainhandItemId(goblin);
    if (!itemId) return;

    const mapping = UNARMED_PICKUP_MAP[itemId];
    if (!mapping) return;

    weaponLocked.add(id);
    safeSetProperty(goblin, "loot:weapon_state",  mapping.state);
    safeSetProperty(goblin, "loot:weapon_texture", mapping.tex);
    safeSetProperty(goblin, "loot:weapon_locked",  true);
}

function onGoblinAttack(entity) {
    const weaponState = safeGetProperty(entity, "loot:weapon_state");
    if (weaponState === WEAPON_CROSSBOW) return;

    safeSetProperty(entity, "loot:attacking", true);
    const ticks = ATTACK_DURATION_TICKS[weaponState] ?? ATTACK_DURATION_TICKS[WEAPON_UNARMED];
    const id    = entity.id;
    const handle = mc.system.runTimeout(() => {
        try { if (entity.isValid()) safeSetProperty(entity, "loot:attacking", false); } catch (_) {}
        attackingTimers.delete(id);
    }, ticks);
    attackingTimers.set(id, handle);
}

function startCrossbowLoad(entity) {
    const id = entity.id;
    if (crossbowTimers.has(id)) return;
    safeSetProperty(entity, "loot:crossbow_phase", 1);
    const loadHandle = mc.system.runTimeout(() => {
        try { if (entity.isValid()) safeSetProperty(entity, "loot:crossbow_phase", 2); } catch (_) {}
        const resetHandle = mc.system.runTimeout(() => {
            try { if (entity.isValid()) safeSetProperty(entity, "loot:crossbow_phase", 0); } catch (_) {}
            crossbowTimers.delete(id);
        }, 10);
        crossbowTimers.set(id, resetHandle);
    }, 25);
    crossbowTimers.set(id, loadHandle);
}

function resetCrossbowPhase(entity) {
    const id = entity.id;
    const existing = crossbowTimers.get(id);
    if (existing !== undefined) mc.system.clearRun(existing);
    crossbowTimers.delete(id);
    try { safeSetProperty(entity, "loot:crossbow_phase", 0); } catch (_) {}
}

function tickDigestion(goblin) {
    const preserved = safeGetProperty(goblin, "loot:preserved");
    if (preserved) return;
    if (lockedGoblins.has(goblin.id)) return;
    const idlePose = safeGetProperty(goblin, "loot:idle_pose") ?? IDLE_POSE_STAND;
    const stage    = safeGetProperty(goblin, "loot:stage") ?? 0;
    if (stage <= 0 || idlePose !== IDLE_POSE_REST) return;

    const current = getDigestion(goblin);
    const next    = current - DIGESTION_TICK;
    if (next <= 0) {
        const newStage = stage - 1;
        safeSetProperty(goblin, "loot:regressing", true);
        triggerEvent(goblin, STAGE_EVENTS[newStage]);
        safeSetProperty(goblin, "loot:stage", newStage);
        setDigestion(goblin, DIGESTION_RESET);
        try { goblin.dimension.playSound("goblin.burp", goblin.location, { volume: 1.0, pitch: 1.0 }); } catch (_) {}
        mc.system.runTimeout(() => {
            try { if (goblin.isValid()) safeSetProperty(goblin, "loot:regressing", false); } catch (_) {}
        }, 20);
    } else {
        setDigestion(goblin, next);
    }
}

function tickIdleTimer(goblin, id, isMoving) {
    if (isMoving) {
        idleTimers.set(id, 0);
        return;
    }
    if (lockedGoblins.has(id)) return;
    const idlePose = safeGetProperty(goblin, "loot:idle_pose") ?? IDLE_POSE_STAND;
    if (idlePose !== IDLE_POSE_STAND) return;

    const timer = (idleTimers.get(id) ?? 0) + 1;
    idleTimers.set(id, timer);
    if (timer >= IDLE_TIMER_THRESHOLD) {
        idleTimers.set(id, 0);
        const stage = safeGetProperty(goblin, "loot:stage") ?? 0;
        const pose  = Math.random() < (stage * 0.25) ? IDLE_POSE_REST : IDLE_POSE_SIT;
        safeSetProperty(goblin, "loot:idle_pose", pose);
    }
}

function tryAutoConsume(goblin, id) {
    if (lockedGoblins.has(id)) return;
    const hp = getHealth(goblin);
    if (!hp || hp.current > LOW_HP_THRESH) return;
    const idlePose = safeGetProperty(goblin, "loot:idle_pose") ?? IDLE_POSE_STAND;
    if (idlePose !== IDLE_POSE_STAND) return;

    const inv   = getInventory(id);
    const stage = safeGetProperty(goblin, "loot:stage") ?? 0;
    const preferEat = Math.random() < (stage * 0.25);

    if (preferEat) {
        for (const itemKey of AUTO_EAT_ORDER) {
            const invKey = itemKey.replace("minecraft:", "").replace("glistering_melon_slice", "golden_melon").replace("melon_slice", "melon");
            if (inv[invKey] > 0) { inv[invKey]--; autoEat(goblin, id, itemKey); return; }
        }
    } else if (inv.honey > 0) {
        inv.honey--; autoHoney(goblin, id); return;
    }
}

function autoHoney(goblin, id) {
    drinkingGoblins.add(id);
    lockGoblin(goblin, 0);
    mc.system.runTimeout(() => {
        try { healToMax(goblin); } catch (_) {}
        unlockGoblin(goblin);
        drinkingGoblins.delete(id);
    }, 40);
}

function autoEat(goblin, id, itemId) {
    const foodIndex = FOOD_INDEX_MAP[itemId] ?? 0;
    eatingGoblins.add(id);
    safeSetProperty(goblin, "loot:food_index", foodIndex);
    lockGoblin(goblin, 1);
    mc.system.runTimeout(() => {
        try { healFlat(goblin); } catch (_) {}
        unlockGoblin(goblin);
        eatingGoblins.delete(id);
    }, 40);
}

function tickBlink(goblin, id) {
    const timer = (blinkTimers.get(id) ?? BLINK_INTERVAL_MIN) - 1;
    if (timer <= 0) {
        safeSetProperty(goblin, "loot:blinking", true);
        blinkTimers.set(id, randInt(BLINK_INTERVAL_MIN, BLINK_INTERVAL_MAX));
        mc.system.runTimeout(() => {
            try { if (goblin.isValid()) safeSetProperty(goblin, "loot:blinking", false); } catch (_) {}
        }, BLINK_DURATION);
    } else {
        blinkTimers.set(id, timer);
    }
}

function triggerPop(goblin, id) {
    const real = Math.random() < 0.5;
    if (real) {
        lockGoblin(goblin, 2);
        mc.system.runTimeout(() => {
            try { if (goblin.isValid()) goblin.dimension.spawnParticle("minecraft:large_explosion", goblin.location); } catch (_) {}
        }, 70);
        mc.system.runTimeout(() => {
            try { if (goblin.isValid()) goblin.kill(); } catch (_) {}
            drinkingGoblins.delete(id);
            poppingGoblins.delete(id);
            lockedGoblins.delete(id);
        }, 80);
    } else {
        poppingGoblins.add(id);
        lockGoblin(goblin, 3);
        mc.system.runTimeout(() => {
            try {
                if (goblin.isValid() && !safeGetProperty(goblin, "loot:tamed")) {
                    unlockGoblin(goblin);
                }
            } catch (_) {}
            drinkingGoblins.delete(id);
            poppingGoblins.delete(id);
        }, 600);
    }
}

function feedHoney(goblin, player) {
    const id = goblin.id;
    if (lockedGoblins.has(id)) return;
    const stage = safeGetProperty(goblin, "loot:stage") ?? 0;
    const preserved = safeGetProperty(goblin, "loot:preserved");
    const tamed = safeGetProperty(goblin, "loot:tamed");

    if (stage >= 3 && !preserved && !tamed) {
        consumeMainhandItem(player);
        triggerPop(goblin, id);
        return;
    }

    consumeMainhandItem(player);
    if (safeGetProperty(goblin, "loot:idle_pose") === IDLE_POSE_REST) safeSetProperty(goblin, "loot:idle_pose", IDLE_POSE_STAND);
    drinkingGoblins.add(id);

    if (preserved) {
        safeSetProperty(goblin, "loot:drink_index", 0);
        lockGoblin(goblin, 5);
        mc.system.runTimeout(() => {
            if (!goblin.isValid()) return;
            healToMax(goblin);
            unlockGoblin(goblin);
            safeSetProperty(goblin, "loot:dizzy", true);
            drinkingGoblins.delete(id);
            mc.system.runTimeout(() => { try { if (goblin.isValid()) safeSetProperty(goblin, "loot:dizzy", false); } catch (_) {} }, 200);
        }, 40);
    } else {
        safeSetProperty(goblin, "loot:drink_index", 0);
        lockGoblin(goblin, 0);
        mc.system.runTimeout(() => {
            try {
                if (goblin.isValid()) {
                    const newStage = (safeGetProperty(goblin, "loot:stage") ?? stage) + 1;
                    triggerEvent(goblin, STAGE_EVENTS[newStage]);
                    safeSetProperty(goblin, "loot:stage", newStage);
                    try { goblin.dimension.playSound("goblin.rumble", goblin.location, { volume: 1.0, pitch: 1.0 }); } catch (_) {}
                }
            } catch (_) {}
            if (goblin.isValid()) healToMax(goblin);
            unlockGoblin(goblin);
            drinkingGoblins.delete(id);
        }, 40);
    }
}

function feedDragonBreath(goblin, player) {
    const id = goblin.id;
    if (lockedGoblins.has(id)) return;
    consumeMainhandItem(player);
    if (safeGetProperty(goblin, "loot:idle_pose") === IDLE_POSE_REST) safeSetProperty(goblin, "loot:idle_pose", IDLE_POSE_STAND);
    drinkingGoblins.add(id);
    safeSetProperty(goblin, "loot:drink_index", 2);
    lockGoblin(goblin, 5);
    mc.system.runTimeout(() => {
        if (!goblin.isValid()) return;
        safeSetProperty(goblin, "loot:preserved", true);
        safeSetProperty(goblin, "loot:hyper", true);
        unlockGoblin(goblin);
        safeSetProperty(goblin, "loot:dizzy", true);
        drinkingGoblins.delete(id);
        mc.system.runTimeout(() => { try { if (goblin.isValid()) safeSetProperty(goblin, "loot:dizzy", false); } catch (_) {} }, 200);
    }, 40);
}

function feedExpBottle(goblin, player) {
    const id = goblin.id;
    if (lockedGoblins.has(id)) return;
    consumeMainhandItem(player);
    if (safeGetProperty(goblin, "loot:idle_pose") === IDLE_POSE_REST) safeSetProperty(goblin, "loot:idle_pose", IDLE_POSE_STAND);
    drinkingGoblins.add(id);
    safeSetProperty(goblin, "loot:drink_index", 1);
    lockGoblin(goblin, 5);
    mc.system.runTimeout(() => {
        if (!goblin.isValid()) return;
        safeSetProperty(goblin, "loot:preserved", false);
        safeSetProperty(goblin, "loot:hyper", false);
        unlockGoblin(goblin);
        safeSetProperty(goblin, "loot:dizzy", true);
        drinkingGoblins.delete(id);
        mc.system.runTimeout(() => { try { if (goblin.isValid()) safeSetProperty(goblin, "loot:dizzy", false); } catch (_) {} }, 200);
    }, 40);
}

function feedFood(goblin, player, itemId) {
    const id = goblin.id;
    if (lockedGoblins.has(id)) return;
    const foodIndex = FOOD_INDEX_MAP[itemId];
    if (foodIndex === undefined) return;
    if (safeGetProperty(goblin, "loot:idle_pose") === IDLE_POSE_REST) safeSetProperty(goblin, "loot:idle_pose", IDLE_POSE_STAND);

    eatingGoblins.add(id);
    consumeMainhandItem(player);
    safeSetProperty(goblin, "loot:food_index", foodIndex);
    lockGoblin(goblin, 1);

    mc.system.runTimeout(() => {
        try {
            if (goblin.isValid()) {
                if (GOLD_FOOD_ITEMS.has(itemId)) healToMax(goblin); else healFlat(goblin);
                if (!safeGetProperty(goblin, "loot:tamed") && TAME_CHANCES[itemId]) {
                    if (Math.random() < TAME_CHANCES[itemId]) {
                        triggerEvent(goblin, "loot:on_tamed");
                        spawnParticleAbove(goblin, "heart");
                    } else spawnParticleAbove(goblin, "smoke");
                }
            }
        } catch (_) {}
        unlockGoblin(goblin);
        eatingGoblins.delete(id);
    }, 40);
}

function triggerRansom(goblin, goldItemId) {
    const id = goblin.id;
    if (lockedGoblins.has(id)) return;
    lockGoblin(goblin, 4);
    try { goblin.dimension.playSound("goblin.idle", goblin.location, { volume: 1.0, pitch: 1.2 }); } catch (_) {}
    if (GOLD_FOOD_ITEMS.has(goldItemId)) safeSetProperty(goblin, "loot:food_index", FOOD_INDEX_MAP[goldItemId] ?? 0);

    mc.system.runTimeout(() => {
        try {
            if (goblin.isValid()) {
                const loot = takeLoot(id, 99);
                for (const stack of loot) goblin.dimension.spawnItem(new mc.ItemStack(stack.typeId, stack.amount), goblin.location);
                if (loot.length > 0) try { goblin.dimension.playSound("goblin.burp", goblin.location, { volume: 0.8, pitch: 1.5 }); } catch (_) {}
            }
        } catch (_) {}
    }, 40);

    mc.system.runTimeout(() => {
        if (goblin.isValid()) {
            unlockGoblin(goblin);
            safeSetProperty(goblin, "loot:food_index", 0);
        }
    }, 60);
}

function displayFood(goblin, player, itemId) {
    const id = goblin.id;
    const foodIndex = FOOD_INDEX_MAP[itemId];
    if (foodIndex === undefined) return;
    consumeMainhandItem(player);
    const inv = getInventory(id);
    const invKey = itemId.replace("minecraft:", "").replace("glistering_melon_slice", "golden_melon").replace("melon_slice", "melon");
    inv[invKey] = (inv[invKey] ?? 0) + 1;
    safeSetProperty(goblin, "loot:food_index", foodIndex);
    mc.system.runTimeout(() => { if (goblin.isValid() && !eatingGoblins.has(id)) safeSetProperty(goblin, "loot:food_index", 0); }, 100);
}

function displayHoney(goblin, player) {
    const id = goblin.id;
    consumeMainhandItem(player);
    getInventory(id).honey++;
    safeSetProperty(goblin, "loot:drink_index", 0);
    mc.system.runTimeout(() => { if (goblin.isValid()) safeSetProperty(goblin, "loot:drink_index", 0); }, 100);
}

// ============================================================
// INITIALIZATION & EVENT SUBSCRIPTIONS
// ============================================================

mc.system.run(() => {
    // Spawn
    mc.world.afterEvents.entitySpawn.subscribe((event) => {
        const entity = event.entity;
        if (isGoblin(entity)) mc.system.runTimeout(() => onGoblinSpawn(entity), 2);
    });

    // Item Interception
    mc.world.afterEvents.entitySpawn.subscribe((event) => {
        const item = event.entity;
        if (!item || item.typeId !== "minecraft:item") return;
        mc.system.run(() => {
            try {
                if (!item.isValid()) return;
                const goblins = item.dimension.getEntities({ families: ["goblin"], location: item.location, maxDistance: 2.0 });
                if (goblins.length > 0) {
                    const g = goblins[0];
                    const itemComponent = item.getComponent("minecraft:item");
                    if (!itemComponent) return;
                    const stack = itemComponent.itemStack;
                    if (stack.typeId === "minecraft:gold_ingot" || GOLD_FOOD_ITEMS.has(stack.typeId)) {
                        item.remove(); triggerRansom(g, stack.typeId);
                    } else {
                        addLoot(g.id, stack.typeId, stack.amount); item.remove();
                        try { g.dimension.playSound("random.pop", g.location, { volume: 0.5, pitch: 1.2 }); } catch (_) {}
                    }
                }
            } catch (_) {}
        });
    });

    // Interact
    mc.world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
        const { player, target: goblin, itemStack } = event;
        if (!isGoblin(goblin)) return;
        const tamed = safeGetProperty(goblin, "loot:tamed");
        const locked = safeGetProperty(goblin, "loot:locked");
        const idlePose = safeGetProperty(goblin, "loot:idle_pose") ?? IDLE_POSE_STAND;
        const itemId = itemStack?.typeId;

        if (player.isSneaking) {
            if (!itemStack) {
                if (locked && safeGetProperty(goblin, "loot:lock_anim") === 3) {
                    event.cancel = true;
                    mc.system.run(() => {
                        if (goblin.isValid()) {
                            triggerEvent(goblin, "loot:on_tamed"); unlockGoblin(goblin); poppingGoblins.delete(goblin.id); spawnParticleAbove(goblin, "heart");
                        }
                    });
                } else if (tamed && idlePose === IDLE_POSE_SIT) {
                    event.cancel = true;
                    mc.system.run(() => { if (goblin.isValid()) setDigestion(goblin, getDigestion(goblin) - DIGESTION_RUB); });
                }
            } else if (itemId === "minecraft:enchanted_golden_apple") {
                if (safeGetProperty(goblin, "loot:weapon_state") === WEAPON_MACE) {
                    event.cancel = true;
                    mc.system.run(() => {
                        try {
                            if (goblin.isValid()) {
                                consumeMainhandItem(player);
                                goblin.dimension.spawnItem(new mc.ItemStack("minecraft:mace", 1), goblin.location);
                                safeSetProperty(goblin, "loot:weapon_state", WEAPON_UNARMED);
                                safeSetProperty(goblin, "loot:weapon_texture", 0);
                                safeSetProperty(goblin, "loot:weapon_locked", false);
                                weaponLocked.delete(goblin.id);
                                try { goblin.dimension.playSound("random.pop", goblin.location, { volume: 1.0, pitch: 0.8 }); } catch (_) {}
                            }
                        } catch (_) {}
                    });
                }
            } else if (GOLD_FOOD_ITEMS.has(itemId) || NORMAL_FOOD_ITEMS.has(itemId)) {
                event.cancel = true;
                mc.system.run(() => { if (goblin.isValid()) displayFood(goblin, player, itemId); });
            } else if (itemId === "minecraft:honey_bottle") {
                event.cancel = true;
                mc.system.run(() => { if (goblin.isValid()) displayHoney(goblin, player); });
            }
            return;
        }

        if (itemId) {
            if (itemId === "minecraft:enchanted_golden_apple") {
                event.cancel = true;
                mc.system.run(() => {
                    try {
                        if (goblin.isValid()) {
                            consumeMainhandItem(player);
                            triggerEvent(goblin, "loot:on_tamed");
                            spawnParticleAbove(goblin, "heart");
                            healToMax(goblin);
                        }
                    } catch (_) {}
                });
                return;
            }
            if (GOLD_FOOD_ITEMS.has(itemId) || (tamed && NORMAL_FOOD_ITEMS.has(itemId))) {
                event.cancel = true; mc.system.run(() => { if (goblin.isValid()) feedFood(goblin, player, itemId); });
                return;
            } else if (itemId === "minecraft:honey_bottle" && !locked) {
                event.cancel = true; mc.system.run(() => { if (goblin.isValid()) feedHoney(goblin, player); });
                return;
            } else if (itemId === "minecraft:dragon_breath") {
                event.cancel = true; mc.system.run(() => { if (goblin.isValid()) feedDragonBreath(goblin, player); });
                return;
            } else if (itemId === "minecraft:experience_bottle") {
                event.cancel = true; mc.system.run(() => { if (goblin.isValid()) feedExpBottle(goblin, player); });
                return;
            }
        }

        if (!itemStack && !locked) {
            if (idlePose === IDLE_POSE_SIT || idlePose === IDLE_POSE_REST) {
                event.cancel = true; mc.system.run(() => { if (goblin.isValid()) safeSetProperty(goblin, "loot:idle_pose", IDLE_POSE_STAND); });
            } else if (tamed) {
                event.cancel = true; mc.system.run(() => { if (goblin.isValid()) safeSetProperty(goblin, "loot:idle_pose", IDLE_POSE_SIT); });
            }
        }
    });

    // Melee attack
    mc.world.afterEvents.entityHitEntity.subscribe((event) => {
        if (isGoblin(event.damagingEntity)) onGoblinAttack(event.damagingEntity);
    });

    // Hit received
    mc.world.afterEvents.entityHurt.subscribe((event) => {
        const victim = event.hurtEntity;
        if (!isGoblin(victim)) return;
        setDigestion(victim, getDigestion(victim) + DIGESTION_HIT);
        if (safeGetProperty(victim, "loot:idle_pose") !== IDLE_POSE_STAND) safeSetProperty(victim, "loot:idle_pose", IDLE_POSE_STAND);
    });

    // Projectile reset
    mc.world.afterEvents.projectileHitEntity.subscribe((e) => { if (isGoblin(e.source)) resetCrossbowPhase(e.source); });
    mc.world.afterEvents.projectileHitBlock.subscribe((e) => { if (isGoblin(e.source)) resetCrossbowPhase(e.source); });

    // Equipment change
    mc.world.afterEvents.entityEquipmentChanged.subscribe((event) => {
        try {
            const goblin = event.entity;
            if (!goblin || !isGoblin(goblin)) return;
            if (event.slot !== "Mainhand") return;
            const itemId = event.itemStack?.typeId ?? null;
            if (itemId === null) {
                if (!weaponLocked.has(goblin.id)) {
                    safeSetProperty(goblin, "loot:weapon_state", WEAPON_UNARMED);
                    safeSetProperty(goblin, "loot:weapon_texture", 0);
                }
                return;
            }
            const pickup = UNARMED_PICKUP_MAP[itemId];
            if (pickup) {
                safeSetProperty(goblin, "loot:weapon_state", pickup.state);
                safeSetProperty(goblin, "loot:weapon_texture", pickup.tex);
                safeSetProperty(goblin, "loot:weapon_locked", true);
                weaponLocked.add(goblin.id);
            } else {
                const tex = WEAPON_TEXTURE_MAP[itemId];
                if (tex !== undefined) safeSetProperty(goblin, "loot:weapon_texture", tex);
            }
        } catch (_) {}
    });

    // Death
    mc.world.afterEvents.entityDie.subscribe((event) => {
        const victim = event.deadEntity;
        if (!isGoblin(victim)) return;
        const id = victim.id;
        const loot = takeLoot(id, 999);
        for (const stack of loot) {
            const dropAmount = Math.floor(stack.amount / 2);
            if (dropAmount > 0) {
                try { victim.dimension.spawnItem(new mc.ItemStack(stack.typeId, dropAmount), victim.location); } catch (_) {}
            }
        }
        const ws = safeGetProperty(victim, "loot:weapon_state");
        if (ws !== WEAPON_UNARMED && ws !== WEAPON_MACE) {
            try {
                const equipment = victim.getComponent("minecraft:equippable");
                const mainhand = equipment.getEquipment(mc.EquipmentSlot.Mainhand);
                if (mainhand) victim.dimension.spawnItem(mainhand, victim.location);
            } catch (_) {}
        }
    });
});

// ============================================================
// TICK LOOP
// ============================================================

mc.system.runInterval(() => {
    for (const player of mc.world.getAllPlayers()) {
        try {
            const goblins = player.dimension.getEntities({ type: GOBLIN_ID, location: player.location, maxDistance: 64 });
            for (const g of goblins) {
                checkNametag(g);
                if (!weaponLocked.has(g.id) && safeGetProperty(g, "loot:weapon_state") === WEAPON_UNARMED) tryWeaponAdmire(g);
                if (safeGetProperty(g, "loot:weapon_state") === WEAPON_CROSSBOW && safeGetProperty(g, "loot:crossbow_phase") === 0 && g.target) startCrossbowLoad(g);
                tickBlink(g, g.id);
                const v = g.getVelocity();
                tickIdleTimer(g, g.id, (Math.abs(v.x) > 0.01 || Math.abs(v.y) > 0.01 || Math.abs(v.z) > 0.01));
                tryAutoConsume(g, g.id);
            }
        } catch (_) {}
    }
}, 5);

mc.system.runInterval(() => {
    for (const player of mc.world.getAllPlayers()) {
        try {
            const goblins = player.dimension.getEntities({ type: GOBLIN_ID, location: player.location, maxDistance: 64 });
            for (const g of goblins) tickDigestion(g);
        } catch (_) {}
    }
}, 20);