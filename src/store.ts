import { JSONArray, JSONObject, JSONPrimitive } from "./json-types";

// Définition des types de permissions possibles pour les opérations sur le store.
export type Permission = "r" | "w" | "rw" | "none";

// Type de résultat renvoyé par la méthode read du store.
export type StoreResult = Store | JSONPrimitive | undefined;

// Type de valeur que le store peut stocker.
export type StoreValue =
  | JSONObject
  | JSONArray
  | StoreResult
  | (() => StoreResult);

// Interface décrivant les méthodes que doit implémenter un store.
export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): StoreResult;
  write(path: string, value: StoreValue): StoreValue;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}

// Décorateur pour restreindre l'accès aux propriétés d'une classe.
export function Restrict(...params: unknown[]): any {
}

// Classe Store implémentant l'interface IStore.
export class Store implements IStore {
  // Objet pour stocker les permissions associées à chaque clé.
  private permissions: { [key: string]: Permission } = {};

  // Politique par défaut pour les clés sans permission spécifiée.
  defaultPolicy: Permission = "rw";

  // Objet pour stocker les données du store.
  private data: JSONObject = {};

  // Méthode pour vérifier si une clé peut être lue selon les permissions.
  allowedToRead(key: string): boolean {
    const permission = this.permissions[key] || this.defaultPolicy;
    return permission.includes("r");
  }

  // Méthode pour vérifier si une clé peut être écrite selon les permissions.
  allowedToWrite(key: string): boolean {
    const permission = this.permissions[key] || this.defaultPolicy;
    return ["w", "rw"].includes(permission);
  }

  // Méthode pour lire une valeur du store en fonction d'un chemin de clés.
  read(path: string): StoreResult {
    if (this.allowedToRead(path)) {
      const keys = path.split(':');
      let current = this.data;
      for (const key of keys.slice(0, -1)) {
        if (current[key] && typeof current[key] === 'object' && !Array.isArray(current[key])) {
          current = current[key] as JSONObject;
        } else {
          return undefined;
        }
      }
      const lastKey = keys[keys.length - 1];
      return current[lastKey] as JSONPrimitive | undefined;
    } else {
      throw new Error("Read access denied.");
    }
  }

  // Méthode pour écrire une valeur dans le store en fonction d'un chemin de clés.
  write(path: string, value: StoreValue): StoreResult {
    if (this.allowedToWrite(path)) {
      const keys = path.split(':');
      let current = this.data;
      for (const key of keys.slice(0, -1)) {
        if (current[key] === undefined || typeof current[key] !== 'object' || Array.isArray(current[key])) {
          current[key] = {};
        }
        current = current[key] as JSONObject;
      }
      const lastKey = keys[keys.length - 1];
      return current[lastKey] = value as JSONPrimitive;
    } else {
      throw new Error("Write access denied.");
    }
  }

  // Méthode pour écrire plusieurs entrées dans le store.
  writeEntries(entries: JSONObject): void {
    try {
      const _this = this;
      Object.keys(entries).forEach(function (key) {
        _this.write(key, entries[key]);
      });
    } catch(e) {
      throw new Error("Write access denied.");
    }
  }

  // Méthode pour obtenir toutes les entrées du store que l'on est autorisé à lire.
  entries(): JSONObject {
    try {
      const entries: JSONObject = {};
      for (const [key, value] of Object.entries(this.data)) {
        if (this.allowedToRead(key)) {
          entries[key] = value;
        }
      }
      return entries;
    } catch(e) {
      throw new Error("Read access denied.");
    }
  }
}