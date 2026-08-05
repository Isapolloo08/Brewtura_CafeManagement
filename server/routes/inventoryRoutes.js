import express from 'express';
import {
  getIngredients, createIngredient, updateIngredient, deleteIngredient,
  recordStockMovement, getStockMovements, stockInFromPo, reverseStockFromPo,
  createRecipe, replaceProductRecipe,
  getRecipeTemplates, createRecipeTemplate, updateRecipeTemplate, deleteRecipeTemplate,
  getSuppliers, createSupplier
} from '../controllers/inventoryController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Ingredients
router.get('/ingredients', getIngredients);
router.post('/ingredients', authorizeRoles('admin', 'manager', 'stock_clerk'), createIngredient);
router.put('/ingredients/:id', authorizeRoles('admin', 'manager', 'stock_clerk'), updateIngredient);
router.delete('/ingredients/:id', authorizeRoles('admin', 'manager'), deleteIngredient);

// Stock Movements
router.get('/stock-movements', getStockMovements);
router.post('/stock-movements', authorizeRoles('admin', 'manager', 'stock_clerk'), recordStockMovement);
router.post('/stock-in-from-po', authorizeRoles('admin', 'manager', 'stock_clerk'), stockInFromPo);
router.post('/reverse-stock-from-po', authorizeRoles('admin', 'manager', 'stock_clerk'), reverseStockFromPo);

// Recipes
router.post('/recipes', authorizeRoles('admin', 'manager'), createRecipe);
router.put('/recipes/product/:product_id', authorizeRoles('admin', 'manager'), replaceProductRecipe);

// Recipe Library
router.get('/recipe-templates', getRecipeTemplates);
router.post('/recipe-templates', authorizeRoles('admin', 'manager'), createRecipeTemplate);
router.put('/recipe-templates/:id', authorizeRoles('admin', 'manager'), updateRecipeTemplate);
router.delete('/recipe-templates/:id', authorizeRoles('admin', 'manager'), deleteRecipeTemplate);

// Suppliers
router.get('/suppliers', getSuppliers);
router.post('/suppliers', authorizeRoles('admin', 'manager', 'stock_clerk'), createSupplier);

export default router;
