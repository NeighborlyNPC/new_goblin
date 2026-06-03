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
const WEAPON_AXE      = 5;
const WEAPON_PICKAXE  = 6;

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
    "minecraft:iron_axe":     { state: WEAPON_AXE,      tex: WTEX_AXE },
    "minecraft:iron_pickaxe": { state: WEAPON_PICKAXE,  tex: WTEX_PICKAXE },
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
    [WEAPON_SPEAR]:   12,
    [WEAPON_AXE]:     14,
    [WEAPON_PICKAXE]: 10
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

const HEALING_ORDER_GOLD = [
    "minecraft:enchanted_golden_apple",
    "minecraft:golden_apple",
    "minecraft:golden_carrot",
    "minecraft:glistering_melon_slice"
];

const HEALING_ORDER_NORMAL = [
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

const BARTER_ITEMS = new Set([
    "minecraft:gold_ingot",
    "minecraft:honey_bottle",
    "minecraft:dragon_breath",
    "minecraft:experience_bottle"
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

function healFlat(entity, amount) {
    try {
        const h = entity.getComponent("minecraft:health");
        if (h) h.setCurrentValue(Math.min(h.currentValue + amount, h.effectiveMax));
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
        const pName = (particle === "heart") ? "minecraft:heart_particle" : particle;
        const loc = { x: entity.location.x, y: entity.location.y + 1.4, z: entity.location.z };
        entity.dimension.spawnParticle(pName, loc);
    } catch (_) {}
}

// ============================================================
// PER-GOBLIN STATE
// ============================================================

const goblinInventory = new Map();
function getInventory(id) {
    if (!goblinInventory.has(id)) {
        goblinInventory.set(id, {
            honey: 0, enchanted_golden_apple: 0, golden_apple: 0, golden_carrot: 0,
            apple: 0, carrot: 0, melon: 0
        });
    }
    return goblinInventory.get(id);
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
    safeSetProperty(goblin, "loot:food_index", -1);
    safeSetProperty(goblin, "loot:drink_index", -1);
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
    safeSetProperty(entity, "loot:food_index", -1);
    safeSetProperty(entity, "loot:drink_index", -1);

    const scale = 0.95 + Math.random() * 0.10;
    safeSetProperty(entity, "loot:scale", scale);
    try {
        const sc = entity.getComponent("minecraft:scale");
        if (sc) sc.value = scale;
    } catch (_) {}

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
    const tamed    = safeGetProperty(goblin, "loot:tamed");
    const timer    = (idleTimers.get(id) ?? 0) + 1;
    idleTimers.set(id, timer);

    if (idlePose === IDLE_POSE_STAND) {
        if (timer >= IDLE_TIMER_THRESHOLD) {
            idleTimers.set(id, 0);
            const stage = safeGetProperty(goblin, "loot:stage") ?? 0;
            const pose  = Math.random() < (stage * 0.25) ? IDLE_POSE_REST : IDLE_POSE_SIT;
            safeSetProperty(goblin, "loot:idle_pose", pose);
            if (pose !== IDLE_POSE_STAND) triggerEvent(goblin, "loot:lock_movement");
        }
    } else {
        // Auto-stand logic for Wild Goblins (10 seconds)
        if (!tamed && timer >= 200) {
            idleTimers.set(id, 0);
            safeSetProperty(goblin, "loot:idle_pose", IDLE_POSE_STAND);
            triggerEvent(goblin, "loot:unlock_movement");
        }
    }
}

function tryAutoConsume(goblin, id) {
    if (lockedGoblins.has(id)) return;
    const hp = getHealth(goblin);
    if (!hp || hp.current > LOW_HP_THRESH) return;
    const idlePose = safeGetProperty(goblin, "loot:idle_pose") ?? IDLE_POSE_STAND;
    if (idlePose !== IDLE_POSE_STAND) return;

    const stage = safeGetProperty(goblin, "loot:stage") ?? 0;
    const inv = getInventory(id);
    
    // HEALING SYSTEM: Stage Bias (Honey vs Food)
    const foodChance = stage * 0.25; // 0: 0, 1: 0.25, 2: 0.5, 3: 0.75
    const chooseFood = Math.random() < foodChance;

    if (chooseFood) {
        if (tryHealingFood(goblin, id, inv)) return;
        if (inv.honey > 0) { inv.honey--; autoHoney(goblin, id, true); return; }
    } else {
        if (inv.honey > 0) { inv.honey--; autoHoney(goblin, id, true); return; }
        if (tryHealingFood(goblin, id, inv)) return;
    }
}

function tryHealingFood(goblin, id, inv) {
    // Check Gold Foods (Order: Enchanted -> Gold Apple -> Gold Carrot -> Glistering Melon)
    for (const itemKey of HEALING_ORDER_GOLD) {
        const invKey = itemKey.replace("minecraft:", "");
        if (inv[invKey] > 0) {
            inv[invKey]--;
            let heal = 9;
            if (itemKey === "minecraft:enchanted_golden_apple") { healToMax(goblin); heal = 0; }
            else if (itemKey === "minecraft:glistering_melon_slice") heal = 8;
            autoEat(goblin, id, itemKey, heal); 
            return true;
        }
    }
    // Check Normal Foods (Order: Apple -> Carrot -> Melon)
    for (const itemKey of HEALING_ORDER_NORMAL) {
        let invKey = itemKey.replace("minecraft:", "");
        if (inv[invKey] > 0) {
            inv[invKey]--;
            let heal = 6;
            if (itemKey === "minecraft:melon_slice") heal = 5;
            autoEat(goblin, id, itemKey, heal); 
            return true;
        }
    }
    return false;
}

function autoHoney(goblin, id, isSelf) {
    const stage = safeGetProperty(goblin, "loot:stage") ?? 0;
    const tamed = safeGetProperty(goblin, "loot:tamed");

    if (stage >= 3) {
        // Pop logic for self-drink
        if (isSelf) {
            // Tamed self-drink: 75% safe, 25% pop. Wild: 50/50.
            const safeChance = tamed ? 0.75 : 0.50;
            const isSafe = Math.random() < safeChance;
            if (isSafe) {
                poppingGoblins.add(id);
                lockGoblin(goblin, 3); // Pop Fake
                mc.system.runTimeout(() => {
                    if (goblin.isValid()) unlockGoblin(goblin);
                    poppingGoblins.delete(id);
                }, 600);
            } else {
                lockGoblin(goblin, 2); // Pop Real
                mc.system.runTimeout(() => {
                    try { if (goblin.isValid()) goblin.kill(); } catch (_) {}
                    lockedGoblins.delete(id);
                }, 72);
            }
        } else {
            // Manual feeding (already 100% safe for tamed in triggerPop)
            triggerPop(goblin, id, false);
        }
        return;
    }

    drinkingGoblins.add(id);
    safeSetProperty(goblin, "loot:drink_index", 0);
    lockGoblin(goblin, 0);
    mc.system.runTimeout(() => {
        if (goblin.isValid()) {
            healToMax(goblin);
            const newStage = stage + 1;
            triggerEvent(goblin, STAGE_EVENTS[newStage]);
            safeSetProperty(goblin, "loot:stage", newStage);
            unlockGoblin(goblin);
        }
        drinkingGoblins.delete(id);
    }, 40);
}

function autoEat(goblin, id, itemId, healAmount) {
    const foodIndex = FOOD_INDEX_MAP[itemId] ?? 0;
    eatingGoblins.add(id);
    safeSetProperty(goblin, "loot:food_index", foodIndex);
    lockGoblin(goblin, 1);
    mc.system.runTimeout(() => {
        if (goblin.isValid()) {
            if (healAmount > 0) healFlat(goblin, healAmount);
            unlockGoblin(goblin);
        }
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

function triggerPop(goblin, id, isAuto) {
    const tamed = safeGetProperty(goblin, "loot:tamed");
    let real = false;
    
    if (isAuto) {
        const safeChance = tamed ? 0.75 : 0.50;
        real = Math.random() > safeChance;
    } else {
        real = tamed ? false : (Math.random() < 0.5);
    }

    if (real) {
        lockGoblin(goblin, 2);
        mc.system.runTimeout(() => {
            try { if (goblin.isValid()) goblin.kill(); } catch (_) {}
            lockedGoblins.delete(id);
        }, 72);
    } else {
        poppingGoblins.add(id);
        lockGoblin(goblin, 3);
        mc.system.runTimeout(() => {
            try { if (goblin.isValid()) unlockGoblin(goblin); } catch (_) {}
            poppingGoblins.delete(id);
        }, 600);
    }
}

function feedHoney(goblin, player) {
    const id = goblin.id;
    if (lockedGoblins.has(id)) return;
    const stage = safeGetProperty(goblin, "loot:stage") ?? 0;
    const preserved = safeGetProperty(goblin, "loot:preserved");

    if (stage >= 3 && !preserved) {
        consumeMainhandItem(player);
        triggerPop(goblin, id, false);
        return;
    }

    consumeMainhandItem(player);
    if (safeGetProperty(goblin, "loot:idle_pose") === IDLE_POSE_REST) safeSetProperty(goblin, "loot:idle_pose", IDLE_POSE_STAND);
    
    drinkingGoblins.add(id);
    safeSetProperty(goblin, "loot:drink_index", 0);

    if (preserved) {
        lockGoblin(goblin, 5);
        mc.system.runTimeout(() => {
            if (goblin.isValid()) {
                healToMax(goblin);
                unlockGoblin(goblin);
                safeSetProperty(goblin, "loot:dizzy", true);
                mc.system.runTimeout(() => { if (goblin.isValid()) safeSetProperty(goblin, "loot:dizzy", false); }, 200);
            }
            drinkingGoblins.delete(id);
        }, 40);
    } else {
        lockGoblin(goblin, 0);
        mc.system.runTimeout(() => {
            if (goblin.isValid()) {
                healToMax(goblin);
                const newStage = Math.min(3, stage + 1);
                triggerEvent(goblin, STAGE_EVENTS[newStage]);
                safeSetProperty(goblin, "loot:stage", newStage);
                unlockGoblin(goblin);
            }
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
        if (goblin.isValid()) {
            safeSetProperty(goblin, "loot:preserved", true);
            safeSetProperty(goblin, "loot:hyper", true);
            unlockGoblin(goblin);
            safeSetProperty(goblin, "loot:dizzy", true);
            mc.system.runTimeout(() => { if (goblin.isValid()) safeSetProperty(goblin, "loot:dizzy", false); }, 200);
        }
        drinkingGoblins.delete(id);
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
        if (goblin.isValid()) {
            safeSetProperty(goblin, "loot:preserved", false);
            safeSetProperty(goblin, "loot:hyper", false);
            unlockGoblin(goblin);
            safeSetProperty(goblin, "loot:dizzy", true);
            mc.system.runTimeout(() => { if (goblin.isValid()) safeSetProperty(goblin, "loot:dizzy", false); }, 200);
        }
        drinkingGoblins.delete(id);
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
        if (goblin.isValid()) {
            if (itemId === "minecraft:enchanted_golden_apple") healToMax(goblin);
            else if (itemId === "minecraft:glistering_melon_slice") healFlat(goblin, 8);
            else if (itemId === "minecraft:melon_slice") healFlat(goblin, 5);
            else if (GOLD_FOOD_ITEMS.has(itemId)) healFlat(goblin, 9);
            else healFlat(goblin, 6);
            
            if (!safeGetProperty(goblin, "loot:tamed") && TAME_CHANCES[itemId]) {
                if (Math.random() < TAME_CHANCES[itemId]) {
                    safeSetProperty(goblin, "loot:tamed", true);
                    triggerEvent(goblin, "loot:on_tamed");
                    spawnParticleAbove(goblin, "heart");
                    safeSetProperty(goblin, "loot:rubbing", true);
                    mc.system.runTimeout(() => { if (goblin.isValid()) safeSetProperty(goblin, "loot:rubbing", false); }, 40);
                } else spawnParticleAbove(goblin, "smoke");
            }
            unlockGoblin(goblin);
        }
        eatingGoblins.delete(id);
    }, 40);
}

// ============================================================
// INITIALIZATION & EVENT SUBSCRIPTIONS
// ============================================================

mc.system.run(() => {
    // Spawn
    mc.world.afterEvents.entitySpawn.subscribe((event) => {
        const entity = event.entity;
        if (isGoblin(entity)) mc.system.runTimeout(() => { try { onGoblinSpawn(entity); } catch (_) {} }, 2);
    });

    // Interact
    mc.world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
        const { player, target: goblin, itemStack } = event;
        if (!isGoblin(goblin)) return;
        const tamed = safeGetProperty(goblin, "loot:tamed");
        const locked = safeGetProperty(goblin, "loot:locked");
        const idlePose = safeGetProperty(goblin, "loot:idle_pose") ?? IDLE_POSE_STAND;
        const preserved = safeGetProperty(goblin, "loot:preserved");
        const itemId = itemStack?.typeId;

        if (player.isSneaking) {
            if (!itemStack) {
                if (locked && safeGetProperty(goblin, "loot:lock_anim") === 3) {
                    event.cancel = true;
                    mc.system.run(() => {
                        if (goblin.isValid()) {
                            safeSetProperty(goblin, "loot:rubbing", true);
                            mc.system.runTimeout(() => {
                                if (goblin.isValid()) {
                                    safeSetProperty(goblin, "loot:rubbing", false);
                                    safeSetProperty(goblin, "loot:tamed", true);
                                    triggerEvent(goblin, "loot:on_tamed"); 
                                    unlockGoblin(goblin); 
                                    poppingGoblins.delete(goblin.id); 
                                    spawnParticleAbove(goblin, "heart");
                                }
                            }, 40);
                        }
                    });
                } else if (tamed && (idlePose === IDLE_POSE_SIT || idlePose === IDLE_POSE_REST || preserved)) {
                    event.cancel = true;
                    mc.system.run(() => { 
                        if (!goblin.isValid()) return;
                        safeSetProperty(goblin, "loot:rubbing", true);
                        mc.system.runTimeout(() => { if (goblin.isValid()) safeSetProperty(goblin, "loot:rubbing", false); }, 12);
                        const next = getDigestion(goblin) - DIGESTION_RUB;
                        if (next <= 0 && safeGetProperty(goblin, "loot:stage") > 0) {
                            const stage = safeGetProperty(goblin, "loot:stage");
                            const newStage = stage - 1;
                            safeSetProperty(goblin, "loot:regressing", true);
                            triggerEvent(goblin, STAGE_EVENTS[newStage]);
                            safeSetProperty(goblin, "loot:stage", newStage);
                            setDigestion(goblin, DIGESTION_RESET);
                            mc.system.runTimeout(() => { if (goblin.isValid()) safeSetProperty(goblin, "loot:regressing", false); }, 200);
                        } else {
                            setDigestion(goblin, next);
                        }
                    });
                }
            } else {
                const isNotchApple = itemId === "minecraft:enchanted_golden_apple";
                const weaponPickup = UNARMED_PICKUP_MAP[itemId];
                const goldMeleePickup = WEAPON_TEXTURE_MAP[itemId];
                
                if (isNotchApple) {
                    const ws = safeGetProperty(goblin, "loot:weapon_state") ?? WEAPON_UNARMED;
                    if (ws !== WEAPON_UNARMED) {
                        event.cancel = true;
                        mc.system.run(() => {
                            if (goblin.isValid()) {
                                const equipment = goblin.getComponent("minecraft:equippable");
                                const heldItem = equipment?.getEquipment(mc.EquipmentSlot.Mainhand);
                                if (heldItem) {
                                    goblin.dimension.spawnItem(heldItem, goblin.location);
                                    equipment.setEquipment(mc.EquipmentSlot.Mainhand, undefined);
                                }
                                consumeMainhandItem(player);
                                safeSetProperty(goblin, "loot:weapon_state", WEAPON_UNARMED);
                                safeSetProperty(goblin, "loot:weapon_tier", 0);
                                safeSetProperty(goblin, "loot:weapon_texture", 0);
                                weaponLocked.delete(goblin.id);
                                safeSetProperty(goblin, "loot:rubbing", true);
                                mc.system.runTimeout(() => { if (goblin.isValid()) safeSetProperty(goblin, "loot:rubbing", false); }, 40);
                            }
                        });
                        return;
                    }
                } else if (weaponPickup || goldMeleePickup) {
                    event.cancel = true;
                    mc.system.run(() => {
                        if (!goblin.isValid()) return;
                        const tier = (itemId.includes("golden_") || itemId.includes("enchanted_")) ? 1 : 0;
                        let state = weaponPickup ? weaponPickup.state : WEAPON_SWORD;
                        if (!weaponPickup) {
                            if (itemId.includes("_axe")) state = WEAPON_AXE;
                            else if (itemId.includes("_spear")) state = WEAPON_SPEAR;
                            else if (itemId.includes("_pickaxe")) state = WEAPON_PICKAXE;
                        }
                        lockGoblin(goblin, 6);
                        const eq = goblin.getComponent("minecraft:equippable");
                        if (eq) {
                            const old = eq.getEquipment(mc.EquipmentSlot.Mainhand);
                            if (old) goblin.dimension.spawnItem(old, goblin.location);
                            eq.setEquipment(mc.EquipmentSlot.Mainhand, new mc.ItemStack(itemId, 1));
                        }
                        consumeMainhandItem(player);
                        safeSetProperty(goblin, "loot:weapon_state", state);
                        safeSetProperty(goblin, "loot:weapon_tier", tier);
                        safeSetProperty(goblin, "loot:weapon_texture", goldMeleePickup ?? 0);
                        weaponLocked.add(goblin.id);
                        mc.system.runTimeout(() => { if (goblin.isValid()) unlockGoblin(goblin); }, 60);
                    });
                    return;
                } else if (GOLD_FOOD_ITEMS.has(itemId) || BARTER_ITEMS.has(itemId)) {
                    event.cancel = true;
                    mc.system.run(() => {
                        if (goblin.isValid()) {
                            const fIndex = FOOD_INDEX_MAP[itemId] ?? -1;
                            const dIndex = (itemId === "minecraft:honey_bottle") ? 0 : (itemId === "minecraft:experience_bottle" ? 1 : (itemId === "minecraft:dragon_breath" ? 2 : -1));
                            safeSetProperty(goblin, "loot:food_index", fIndex);
                            safeSetProperty(goblin, "loot:drink_index", dIndex);
                            const eq = goblin.getComponent("minecraft:equippable");
                            if (eq) eq.setEquipment(mc.EquipmentSlot.Mainhand, new mc.ItemStack(itemId, 1));
                            consumeMainhandItem(player);
                            lockGoblin(goblin, 4);
                            mc.system.runTimeout(() => {
                                if (goblin.isValid()) {
                                    if (eq) eq.setEquipment(mc.EquipmentSlot.Mainhand, undefined);
                                    goblin.dimension.runCommand(`loot spawn ${goblin.location.x} ${goblin.location.y} ${goblin.location.z} loot "loot_tables/entities/goblin_barter.json"`);
                                    mc.system.runTimeout(() => { if (goblin.isValid()) unlockGoblin(goblin); }, 40);
                                }
                            }, 80);
                        }
                    });
                    return;
                }
            }
            return;
        }

        if (itemId) {
            if (itemId === "minecraft:enchanted_golden_apple") {
                event.cancel = true;
                mc.system.run(() => {
                    if (goblin.isValid()) {
                        consumeMainhandItem(player);
                        safeSetProperty(goblin, "loot:tamed", true);
                        triggerEvent(goblin, "loot:on_tamed");
                        spawnParticleAbove(goblin, "heart");
                        healToMax(goblin);
                        safeSetProperty(goblin, "loot:rubbing", true);
                        mc.system.runTimeout(() => { if (goblin.isValid()) safeSetProperty(goblin, "loot:rubbing", false); }, 40);
                    }
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
                event.cancel = true; 
                mc.system.run(() => { 
                    if (goblin.isValid()) {
                        safeSetProperty(goblin, "loot:idle_pose", IDLE_POSE_STAND);
                        triggerEvent(goblin, "loot:unlock_movement");
                    }
                });
            } else if (tamed) {
                event.cancel = true; 
                mc.system.run(() => { 
                    if (goblin.isValid()) {
                        safeSetProperty(goblin, "loot:idle_pose", IDLE_POSE_SIT);
                        triggerEvent(goblin, "loot:lock_movement");
                    }
                });
            }
        }
    });

    mc.world.afterEvents.entityHurt.subscribe((event) => {
        const victim = event.hurtEntity;
        if (!isGoblin(victim)) return;
        setDigestion(victim, getDigestion(victim) + DIGESTION_HIT);
        if (safeGetProperty(victim, "loot:idle_pose") !== IDLE_POSE_STAND) safeSetProperty(victim, "loot:idle_pose", IDLE_POSE_STAND);
        
        const id = victim.id;
        if (!lockedGoblins.has(id)) {
            const hp = getHealth(victim);
            if (hp && hp.current <= LOW_HP_THRESH) {
                mc.system.run(() => { if (victim.isValid()) tryAutoConsume(victim, id); });
            }
        }
    });

    mc.world.afterEvents.projectileHitEntity.subscribe((e) => { if (isGoblin(e.source)) resetCrossbowPhase(e.source); });
    mc.world.afterEvents.projectileHitBlock.subscribe((e) => { if (isGoblin(e.source)) resetCrossbowPhase(e.source); });

    if (mc.world.afterEvents.entityEquipmentChanged) {
        mc.world.afterEvents.entityEquipmentChanged.subscribe((event) => {
            const goblin = event.entity;
            if (!goblin || !isGoblin(goblin) || event.slot !== "Mainhand") return;
            if ((event.itemStack?.typeId ?? null) === null) {
                mc.system.run(() => {
                    if (goblin.isValid()) {
                        safeSetProperty(goblin, "loot:weapon_state", WEAPON_UNARMED);
                        safeSetProperty(goblin, "loot:weapon_tier", 0);
                        safeSetProperty(goblin, "loot:weapon_texture", 0);
                        weaponLocked.delete(goblin.id);
                    }
                });
            }
        });
    }

    mc.world.afterEvents.entityDie.subscribe((event) => {
        const victim = event.deadEntity;
        if (!isGoblin(victim)) return;
        const inv = victim.getComponent("minecraft:inventory");
        if (inv && inv.container) {
            for (let i = 0; i < inv.container.size; i++) {
                const item = inv.container.getItem(i);
                if (item) victim.dimension.spawnItem(item, victim.location);
            }
        }
    });

    // FLOOR PICKUP LOGIC
    mc.world.afterEvents.entityInventoryContainerItemChanged.subscribe((event) => {
        const entity = event.entity;
        if (!isGoblin(entity)) return;
        const id = entity.id;
        const item = event.newItem;
        if (!item) return;

        const typeId = item.typeId;
        const inv = getInventory(id);
        let invKey = typeId.replace("minecraft:", "");
        if (invKey === "glistering_melon_slice") invKey = "melon";
        else if (invKey === "melon_slice") invKey = "melon";
        
        if (invKey in inv || typeId === "minecraft:honey_bottle") {
            const actualKey = (typeId === "minecraft:honey_bottle") ? "honey" : invKey;
            inv[actualKey] += item.amount;
            
            mc.system.run(() => {
                if (entity.isValid()) {
                    const container = entity.getComponent("minecraft:inventory")?.container;
                    if (container) container.setItem(event.slot, undefined);
                }
            });
        }
    });
});

mc.system.runInterval(() => {
    for (const player of mc.world.getAllPlayers()) {
        const goblins = player.dimension.getEntities({ type: GOBLIN_ID, location: player.location, maxDistance: 64 });
        for (const g of goblins) {
            checkNametag(g);
            if (safeGetProperty(g, "loot:weapon_state") === WEAPON_CROSSBOW && safeGetProperty(g, "loot:crossbow_phase") === 0 && g.target) startCrossbowLoad(g);
            tickBlink(g, g.id);
            const v = g.getVelocity();
            tickIdleTimer(g, g.id, (Math.abs(v.x) > 0.01 || Math.abs(v.y) > 0.01 || Math.abs(v.z) > 0.01));
            tryAutoConsume(g, g.id);
        }
    }
}, 5);

mc.system.runInterval(() => {
    for (const player of mc.world.getAllPlayers()) {
        const goblins = player.dimension.getEntities({ type: GOBLIN_ID, location: player.location, maxDistance: 64 });
        for (const g of goblins) tickDigestion(g);
    }
}, 20);