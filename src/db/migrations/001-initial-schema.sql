-- Up
CREATE TABLE User (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  -- Constraints
  CONSTRAINT User_ck_tole CHECK (role IN ('Waiter', 'Cashier', 'Admin')),
  CONSTRAINT User_uk_username UNIQUE (username)
);

-- Create a super user by default
INSERT INTO User (id, username, password, name, role)
  VALUES (1, 'admin', '$2a$10$DD6zda4qajdMwB/QrDn9QuW.WllpsCowOScMVmZOyqxXw1/1xBfK2', 'Administrator', 'Admin');

CREATE TABLE ItemType (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

-- Use predefined set of item types
INSERT INTO ItemType(id, name) VALUES (1, 'Kitchen');
INSERT INTO ItemType(id, name) VALUES (2, 'Bar');
INSERT INTO ItemType(id, name) VALUES (3, 'Coffee');

CREATE TABLE Item (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  itemTypeId INTEGER NOT NULL,
  threshold REAL,

  -- Constraints
  CONSTRAINT Item_fk_itemTypeId FOREIGN KEY (itemTypeId)
    REFERENCES ItemType(id)
);

CREATE INDEX Item_ix_itemTypeId ON Item(itemTypeId);

-- Keep track of the latest stock qty for each item, avoiding traversing through
-- all the purchase and orders for finding out current stock balance
CREATE TABLE ItemStock (
  id INTEGER PRIMARY KEY,
  userId INTEGER NOT NULL,
  itemId INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  stock REAL NOT NULL,

  -- Constraints
  CONSTRAINT ItemStock_fk_userId FOREIGN KEY (userId)
    REFERENCES User(id),
  CONSTRAINT ItemStock_fk_itemId FOREIGN KEY (itemId)
    REFERENCES Item(id)
);

CREATE INDEX ItemStock_ix_userId ON ItemStock(userId);
CREATE INDEX ItemStock_ix_itemId ON ItemStock(itemId, timestamp);

CREATE TABLE MenuItem (
  id INTEGER PRIMARY KEY,
  itemId INTEGER NULL,    -- Use null for Custom Item type
  itemTypeId INTEGER NULL, -- Should be null except for custom item type
  name TEXT NOT NULL,
  qty REAL NOT NULL,
  price REAL NOT NULL,

  -- Constraints
  CONSTRAINT MenuItem_fk_itemId FOREIGN KEY (itemId)
    REFERENCES Item(id),
  CONSTRAINT MenuItem_fk_itemTypeId FOREIGN KEY (itemTypeId)
    REFERENCES ItemType(id)
);

CREATE INDEX MenuItem_ix_itemId ON MenuItem(itemId);
CREATE INDEX MenuItem_ix_itemTypeId ON MenuItem(itemTypeId);

CREATE TABLE Purchase (
  id INTEGER PRIMARY KEY,
  userId INTEGER NOT NULL,
  itemId INTEGER NULL,
  timestamp INTEGER NOT NULL,
  qty REAL NOT NULL,

  -- Constraints
  CONSTRAINT Purchase_fk_userId FOREIGN KEY (userId)
    REFERENCES User(id),
  CONSTRAINT Purchase_fk_itemId FOREIGN KEY (itemId)
    REFERENCES Item(id)
);

CREATE INDEX Purchase_ix_userId ON Purchase(userId);
CREATE INDEX Purchase_ix_itemId ON Purchase(itemId);

CREATE TABLE [Table] (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  top INTEGER NOT NULL,
  left INTEGER NOT NULL,
  angle INTEGER NOT NULL,


  -- Constraints
  CONSTRAINT Table_uk_name UNIQUE (name)
);

CREATE TABLE [Order] (
  id INTEGER PRIMARY KEY,
  userId INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  tableId INTEGER NOT NULL,
  status TEXT NOT NULL,
  discount REAL NOT NULL,
  remark TEXT,

  -- Constraints
  CONSTRAINT Order_userId FOREIGN KEY (userId)
    REFERENCES [User](id),
  CONSTRAINT Order_fk_tableId FOREIGN KEY (tableId)
    REFERENCES [Table](id)
);

CREATE INDEX Order_ix_userId ON [Order](userId);
CREATE INDEX Order_ix_tableId ON [Order](tableId);

CREATE TABLE OrderItem (
  id INTEGER PRIMARY KEY,
  orderId INTEGER NOT NULL,
  menuItemId INTEGER NOT NULL,
  qty REAL NOT NULL, -- The number of units ordered like 1 or 2 (Using real for some scenario of ordering half)
  rate REAL NOT NULL, -- The rate at which the item was billed (by default the one provided in menu item)

  -- Constraints
  CONSTRAINT OrderItem_fk_orderId FOREIGN KEY (orderId)
    REFERENCES [Order](id),
  CONSTRAINT OrderItem_fk_menuItemId FOREIGN KEY (menuItemId)
    REFERENCES MenuItem(id)
);

CREATE INDEX OrderItem_ix_orderId ON OrderItem(orderId);
CREATE INDEX OrderItem_ix_menuItemId ON OrderItem(menuItemId);

-- Down
