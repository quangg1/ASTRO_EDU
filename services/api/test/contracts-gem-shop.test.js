const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseGemShopCatalogItems,
  parseGemWalletResponse,
  parseCourseEditorListResponse,
} = require('@galaxies/contracts');

describe('@galaxies/contracts parsers', () => {
  it('parseGemShopCatalogItems accepts a valid row', () => {
    const items = parseGemShopCatalogItems([
      {
        skuId: 'test-sku',
        nameVi: 'Tên',
        descriptionVi: 'Mô tả',
        category: 'cosmetic',
        basePriceGem: 10,
        effectivePriceGem: 8,
        metadata: {},
      },
    ]);
    assert.equal(items.length, 1);
    assert.equal(items[0].skuId, 'test-sku');
  });

  it('parseGemWalletResponse accepts wallet payload', () => {
    const data = parseGemWalletResponse({
      success: true,
      data: {
        balance: 5,
        transactions: [
          {
            id: 'tx1',
            amount: 5,
            reason: 'lesson_complete',
            type: 'lesson_complete',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });
    assert.equal(data.balance, 5);
    assert.equal(data.transactions.length, 1);
  });

  it('parseCourseEditorListResponse normalizes editor list', () => {
    const rows = parseCourseEditorListResponse({
      success: true,
      data: [
        {
          id: 42,
          title: 'Khóa A',
          slug: 'khoa-a',
          level: 'beginner',
          published: false,
        },
      ],
    });
    assert.equal(rows[0].id, '42');
    assert.equal(rows[0].slug, 'khoa-a');
  });
});
