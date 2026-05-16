/**
 * @jest-environment jsdom
 */

import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach
} from '@jest/globals';

let mockFrom;

let mockReviewsSelect;
let mockVendorsSelect;
let mockVendorsIn;

async function loadStudentAnalyticsModule({
  reviewsVenIdResult = {
    data: [],
    error: null
  },

  reviewsVendorIdResult = {
    data: [],
    error: null
  },

  vendorsIdResult = {
    data: [],
    error: null
  },

  vendorsVendorIdResult = {
    data: [],
    error: null
  }
} = {}) {
  jest.resetModules();

  mockReviewsSelect = jest.fn((columns) => {
    if (columns === 'ven_id, rating') {
      return Promise.resolve(reviewsVenIdResult);
    }

    if (columns === 'vendor_id, rating') {
      return Promise.resolve(reviewsVendorIdResult);
    }

    return Promise.resolve({
      data: [],
      error: null
    });
  });

  mockVendorsIn = jest.fn((column, vendorIds) => {
    if (column === 'id') {
      return Promise.resolve(vendorsIdResult);
    }

    if (column === 'vendor_id') {
      return Promise.resolve(vendorsVendorIdResult);
    }

    return Promise.resolve({
      data: [],
      error: null
    });
  });

  mockVendorsSelect = jest.fn(() => ({
    in: mockVendorsIn
  }));

  mockFrom = jest.fn((tableName) => {
    if (tableName === 'reviews') {
      return {
        select: mockReviewsSelect
      };
    }

    if (tableName === 'vendors') {
      return {
        select: mockVendorsSelect
      };
    }

    return {
      select: jest.fn()
    };
  });

  jest.unstable_mockModule('../config/supabase.js', () => ({
    sb: {
      from: mockFrom
    }
  }));

  return await import('./student-analytics.js');
}

describe('student-analytics.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    delete window.loadTopVendorsPage;
  });

  afterEach(() => {
    jest.restoreAllMocks();

    delete window.loadTopVendorsPage;
  });

  test('assigns loadTopVendorsPage to window', async () => {
    const module = await loadStudentAnalyticsModule();

    expect(window.loadTopVendorsPage).toBe(module.loadTopVendorsPage);
  });

  test('returns early and logs error when top vendors container is missing', async () => {
    const { loadTopVendorsPage } = await loadStudentAnalyticsModule();

    await loadTopVendorsPage();

    expect(console.error).toHaveBeenCalledWith(
      'Missing #topVendorsPageContainer in HTML.'
    );

    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('renders no ratings message when reviews table has no ratings', async () => {
    const { loadTopVendorsPage } = await loadStudentAnalyticsModule({
      reviewsVenIdResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="topVendorsPageContainer"></div>
    `;

    await loadTopVendorsPage();

    expect(document.getElementById('topVendorsPageContainer').innerHTML).toContain(
      'No vendor ratings available yet.'
    );

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(mockReviewsSelect).toHaveBeenCalledWith('ven_id, rating');
  });

  test('ignores invalid reviews with missing vendor id or zero rating', async () => {
    const { loadTopVendorsPage } = await loadStudentAnalyticsModule({
      reviewsVenIdResult: {
        data: [
          {
            ven_id: null,
            rating: 5
          },
          {
            ven_id: 'v1',
            rating: 0
          },
          {
            ven_id: 'v2',
            rating: null
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="topVendorsPageContainer"></div>
    `;

    await loadTopVendorsPage();

    expect(document.getElementById('topVendorsPageContainer').innerHTML).toContain(
      'No vendor ratings available yet.'
    );

    expect(mockFrom).not.toHaveBeenCalledWith('vendors');
  });

  test('renders top vendors using reviews.ven_id and vendors.id', async () => {
    const { loadTopVendorsPage } = await loadStudentAnalyticsModule({
      reviewsVenIdResult: {
        data: [
          {
            ven_id: 'v1',
            rating: 5
          },
          {
            ven_id: 'v1',
            rating: 3
          },
          {
            ven_id: 'v2',
            rating: 5
          },
          {
            ven_id: 'v3',
            rating: 4
          }
        ],
        error: null
      },

      vendorsIdResult: {
        data: [
          {
            id: 'v1',
            username: 'Kota Palace'
          },
          {
            id: 'v2',
            username: 'Burger Spot'
          },
          {
            id: 'v3',
            username: 'Pizza Place'
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="topVendorsPageContainer"></div>
    `;

    await loadTopVendorsPage();

    const html = document.getElementById('topVendorsPageContainer').innerHTML;

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(mockFrom).toHaveBeenCalledWith('vendors');

    expect(mockReviewsSelect).toHaveBeenCalledWith('ven_id, rating');
    expect(mockVendorsSelect).toHaveBeenCalledWith('id, username');
    expect(mockVendorsIn).toHaveBeenCalledWith('id', ['v1', 'v2', 'v3']);

    expect(html).toContain('🥇');
    expect(html).toContain('🥈');
    expect(html).toContain('🥉');

    expect(html).toContain('#1 — Burger Spot');
    expect(html).toContain('#2 — Kota Palace');
    expect(html).toContain('#3 — Pizza Place');

    expect(html).toContain('⭐ 5.0');
    expect(html).toContain('⭐ 4.0');

    expect(html).toContain('1 review');
    expect(html).toContain('2 reviews');
  });

  test('sorts by review count when average rating is tied', async () => {
    const { loadTopVendorsPage } = await loadStudentAnalyticsModule({
      reviewsVenIdResult: {
        data: [
          {
            ven_id: 'v1',
            rating: 4
          },
          {
            ven_id: 'v1',
            rating: 4
          },
          {
            ven_id: 'v2',
            rating: 4
          }
        ],
        error: null
      },

      vendorsIdResult: {
        data: [
          {
            id: 'v1',
            username: 'Two Reviews Vendor'
          },
          {
            id: 'v2',
            username: 'One Review Vendor'
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="topVendorsPageContainer"></div>
    `;

    await loadTopVendorsPage();

    const html = document.getElementById('topVendorsPageContainer').innerHTML;

    expect(html.indexOf('Two Reviews Vendor')).toBeLessThan(
      html.indexOf('One Review Vendor')
    );
  });

  test('limits the rendered ranking to top 3 vendors', async () => {
    const { loadTopVendorsPage } = await loadStudentAnalyticsModule({
      reviewsVenIdResult: {
        data: [
          {
            ven_id: 'v1',
            rating: 5
          },
          {
            ven_id: 'v2',
            rating: 4
          },
          {
            ven_id: 'v3',
            rating: 3
          },
          {
            ven_id: 'v4',
            rating: 2
          }
        ],
        error: null
      },

      vendorsIdResult: {
        data: [
          {
            id: 'v1',
            username: 'Vendor 1'
          },
          {
            id: 'v2',
            username: 'Vendor 2'
          },
          {
            id: 'v3',
            username: 'Vendor 3'
          },
          {
            id: 'v4',
            username: 'Vendor 4'
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="topVendorsPageContainer"></div>
    `;

    await loadTopVendorsPage();

    const html = document.getElementById('topVendorsPageContainer').innerHTML;

    expect(html).toContain('Vendor 1');
    expect(html).toContain('Vendor 2');
    expect(html).toContain('Vendor 3');
    expect(html).not.toContain('Vendor 4');
  });

  test('falls back to reviews.vendor_id when reviews.ven_id fails', async () => {
    const venIdError = {
      message: 'Column ven_id does not exist'
    };

    const { loadTopVendorsPage } = await loadStudentAnalyticsModule({
      reviewsVenIdResult: {
        data: null,
        error: venIdError
      },

      reviewsVendorIdResult: {
        data: [
          {
            vendor_id: 'v1',
            rating: 5
          }
        ],
        error: null
      },

      vendorsIdResult: {
        data: [
          {
            id: 'v1',
            username: 'Fallback Vendor'
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="topVendorsPageContainer"></div>
    `;

    await loadTopVendorsPage();

    expect(console.warn).toHaveBeenCalledWith(
      'Could not use reviews.ven_id:',
      venIdError
    );

    expect(mockReviewsSelect).toHaveBeenCalledWith('vendor_id, rating');

    expect(document.getElementById('topVendorsPageContainer').innerHTML).toContain(
      'Fallback Vendor'
    );
  });

  test('falls back to vendors.vendor_id when vendors.id lookup fails', async () => {
    const vendorIdError = {
      message: 'Column id does not exist'
    };

    const { loadTopVendorsPage } = await loadStudentAnalyticsModule({
      reviewsVenIdResult: {
        data: [
          {
            ven_id: 'v1',
            rating: 5
          }
        ],
        error: null
      },

      vendorsIdResult: {
        data: null,
        error: vendorIdError
      },

      vendorsVendorIdResult: {
        data: [
          {
            vendor_id: 'v1',
            username: 'Vendor ID Fallback'
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="topVendorsPageContainer"></div>
    `;

    await loadTopVendorsPage();

    expect(console.warn).toHaveBeenCalledWith(
      'Could not use vendors.id:',
      vendorIdError
    );

    expect(mockVendorsSelect).toHaveBeenCalledWith('vendor_id, username');
    expect(mockVendorsIn).toHaveBeenCalledWith('vendor_id', ['v1']);

    expect(document.getElementById('topVendorsPageContainer').innerHTML).toContain(
      'Vendor ID Fallback'
    );
  });

  test('uses Vendor id fallback name when vendor lookup returns no matching name', async () => {
    const { loadTopVendorsPage } = await loadStudentAnalyticsModule({
      reviewsVenIdResult: {
        data: [
          {
            ven_id: 'v99',
            rating: 5
          }
        ],
        error: null
      },

      vendorsIdResult: {
        data: [],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="topVendorsPageContainer"></div>
    `;

    await loadTopVendorsPage();

    expect(document.getElementById('topVendorsPageContainer').innerHTML).toContain(
      'Vendor v99'
    );
  });

  test('uses fallback vendor username when username is missing in vendors.id result', async () => {
    const { loadTopVendorsPage } = await loadStudentAnalyticsModule({
      reviewsVenIdResult: {
        data: [
          {
            ven_id: 'v1',
            rating: 5
          }
        ],
        error: null
      },

      vendorsIdResult: {
        data: [
          {
            id: 'v1',
            username: ''
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="topVendorsPageContainer"></div>
    `;

    await loadTopVendorsPage();

    expect(document.getElementById('topVendorsPageContainer').innerHTML).toContain(
      'Vendor v1'
    );
  });

  test('uses fallback vendor username when username is missing in vendors.vendor_id result', async () => {
    const { loadTopVendorsPage } = await loadStudentAnalyticsModule({
      reviewsVenIdResult: {
        data: [
          {
            ven_id: 'v1',
            rating: 5
          }
        ],
        error: null
      },

      vendorsIdResult: {
        data: null,
        error: {
          message: 'id failed'
        }
      },

      vendorsVendorIdResult: {
        data: [
          {
            vendor_id: 'v1',
            username: ''
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="topVendorsPageContainer"></div>
    `;

    await loadTopVendorsPage();

    expect(document.getElementById('topVendorsPageContainer').innerHTML).toContain(
      'Vendor v1'
    );
  });

  test('uses fallback vendor name when both vendor lookup methods fail', async () => {
    const idError = {
      message: 'id lookup failed'
    };

    const vendorIdError = {
      message: 'vendor_id lookup failed'
    };

    const { loadTopVendorsPage } = await loadStudentAnalyticsModule({
      reviewsVenIdResult: {
        data: [
          {
            ven_id: 'v1',
            rating: 5
          }
        ],
        error: null
      },

      vendorsIdResult: {
        data: null,
        error: idError
      },

      vendorsVendorIdResult: {
        data: null,
        error: vendorIdError
      }
    });

    document.body.innerHTML = `
      <div id="topVendorsPageContainer"></div>
    `;

    await loadTopVendorsPage();

    expect(console.warn).toHaveBeenCalledWith(
      'Could not use vendors.id:',
      idError
    );

    expect(console.warn).toHaveBeenCalledWith(
      'Could not use vendors.vendor_id:',
      vendorIdError
    );

    expect(document.getElementById('topVendorsPageContainer').innerHTML).toContain(
      'Vendor v1'
    );
  });

  test('renders error message when both review column lookups fail', async () => {
    const venIdError = {
      message: 'ven_id failed'
    };

    const vendorIdError = {
      message: 'vendor_id failed'
    };

    const { loadTopVendorsPage } = await loadStudentAnalyticsModule({
      reviewsVenIdResult: {
        data: null,
        error: venIdError
      },

      reviewsVendorIdResult: {
        data: null,
        error: vendorIdError
      }
    });

    document.body.innerHTML = `
      <div id="topVendorsPageContainer"></div>
    `;

    await loadTopVendorsPage();

    expect(console.warn).toHaveBeenCalledWith(
      'Could not use reviews.ven_id:',
      venIdError
    );

    expect(console.error).toHaveBeenCalledWith(
      'Could not use reviews.vendor_id:',
      vendorIdError
    );

    expect(console.error).toHaveBeenCalledWith(
      'Top vendors page error:',
      vendorIdError
    );

    const html = document.getElementById('topVendorsPageContainer').innerHTML;

    expect(html).toContain('Failed to load vendor rankings');
    expect(html).toContain('top-vendors-empty error');
  });

  test('escapes vendor names before rendering', async () => {
    const { loadTopVendorsPage } = await loadStudentAnalyticsModule({
      reviewsVenIdResult: {
        data: [
          {
            ven_id: 'v1',
            rating: 5
          }
        ],
        error: null
      },

      vendorsIdResult: {
        data: [
          {
            id: 'v1',
            username: '<script>alert("x")</script> & vendor'
          }
        ],
        error: null
      }
    });

    document.body.innerHTML = `
      <div id="topVendorsPageContainer"></div>
    `;

    await loadTopVendorsPage();

    const html = document.getElementById('topVendorsPageContainer').innerHTML;

    expect(html).toContain(
      '&lt;script&gt;alert("x")&lt;/script&gt; &amp; vendor'
    );

    expect(html).not.toContain('<script>');
  });
});
