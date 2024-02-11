import sqlite3 from 'better-sqlite3';
import { checkFileExists } from '../util.js';
import * as sqlite_vss from "sqlite-vss";
import { createEmbeddingsTable, createVirtualTable} from './sql.js';

export class VectorStore {
  constructor(dbPath) {
    this.db = new sqlite3(dbPath);
    sqlite_vss.load(this.db);
	}

  size() {

  }

  embed() {

  }

  updateIndex() {

  }

  deleteFileChunks(fileName) {
    this.wrapInTransaction(() => {
      // this.db.run(, [fileName]);
    });
  }

  wrapInTransaction(func) {
    this.db.exec('BEGIN');

    try {
      func();
      this.db.exec('COMMIT');
    } catch (error) {
      console.error(error);
      this.db.exec('ROLLBACK');
      return false;
    }

    return true;
  }

  run(stmt, params) {
    try {
      return this.db.prepare(stmt).run();
    } catch (error) {
      console.error(stmt, error);
      return false;
    }
  }

  configure() {
    /**
     * Configures the vector store database by creating necessary tables and virtual tables.
     * @returns {boolean} Returns true if the configuration is successful, false otherwise.
     */
    try {
      this.db.prepare(createEmbeddingsTable).run();
    } catch (error) {
      console.error(error);
      return false;
    }

    try {
      this.db.prepare(createVirtualTable).run();
    } catch (error) {
      console.error(error);
      return false;
    }

    return true;
  }
}