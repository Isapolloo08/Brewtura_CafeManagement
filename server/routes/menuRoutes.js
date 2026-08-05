import express from 'express';
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getProducts, createProduct, updateProduct, deleteProduct,
  getCustomizationTemplates, createCustomizationTemplate, updateCustomizationTemplate, deleteCustomizationTemplate,
  createCustomization, getCustomizationRecipes, getAddons, createAddon, updateAddon, deleteAddon,
  getTemperatureOptions, createTemperatureOption, updateTemperatureOption, deleteTemperatureOption,
  getMilkOptions, createMilkOption, updateMilkOption, deleteMilkOption
} from '../controllers/menuController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Public / Barista read access
router.get('/categories', getCategories);
router.get('/products', getProducts);
router.get('/customization-templates', getCustomizationTemplates);
router.get('/addons', getAddons);
router.get('/temperatures', getTemperatureOptions);
router.get('/milks', getMilkOptions);

// Admin / Manager write access
router.post('/categories', authenticateToken, authorizeRoles('admin', 'manager'), createCategory);
router.put('/categories/:id', authenticateToken, authorizeRoles('admin', 'manager'), updateCategory);
router.delete('/categories/:id', authenticateToken, authorizeRoles('admin', 'manager'), deleteCategory);

router.post('/products', authenticateToken, authorizeRoles('admin', 'manager'), createProduct);
router.put('/products/:id', authenticateToken, authorizeRoles('admin', 'manager'), updateProduct);
router.delete('/products/:id', authenticateToken, authorizeRoles('admin', 'manager'), deleteProduct);

router.post('/customizations', authenticateToken, authorizeRoles('admin', 'manager'), createCustomization);
router.get('/customizations/:id/recipes', getCustomizationRecipes);

router.post('/customization-templates', authenticateToken, authorizeRoles('admin', 'manager'), createCustomizationTemplate);
router.put('/customization-templates/:id', authenticateToken, authorizeRoles('admin', 'manager'), updateCustomizationTemplate);
router.delete('/customization-templates/:id', authenticateToken, authorizeRoles('admin', 'manager'), deleteCustomizationTemplate);

router.post('/addons', authenticateToken, authorizeRoles('admin', 'manager'), createAddon);
router.put('/addons/:id', authenticateToken, authorizeRoles('admin', 'manager'), updateAddon);
router.delete('/addons/:id', authenticateToken, authorizeRoles('admin', 'manager'), deleteAddon);

router.post('/temperatures', authenticateToken, authorizeRoles('admin', 'manager'), createTemperatureOption);
router.put('/temperatures/:id', authenticateToken, authorizeRoles('admin', 'manager'), updateTemperatureOption);
router.delete('/temperatures/:id', authenticateToken, authorizeRoles('admin', 'manager'), deleteTemperatureOption);

router.post('/milks', authenticateToken, authorizeRoles('admin', 'manager'), createMilkOption);
router.put('/milks/:id', authenticateToken, authorizeRoles('admin', 'manager'), updateMilkOption);
router.delete('/milks/:id', authenticateToken, authorizeRoles('admin', 'manager'), deleteMilkOption);

export default router;
