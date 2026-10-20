/* Independent portfolio example. No network, credentials or client integrations. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OrderWorkflow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const text = value => typeof value === 'string' ? value.trim() : '';
  const normalizeId = value => text(value).toUpperCase();
  const validId = value => /^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(value);
  const issue = (code, message) => ({ code, message });

  function processOrders(orders) {
    if (!Array.isArray(orders)) throw new TypeError('Input must be a JSON array of orders.');
    if (orders.length > 500) throw new RangeError('Use 500 orders or fewer per run.');
    const counts = new Map();
    for (const order of orders) {
      const id = normalizeId(order && order.id);
      if (validId(id)) counts.set(id, (counts.get(id) || 0) + 1);
    }
    const results = Array.from(orders, (input, index) => {
      const order = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
      const id = normalizeId(order.id);
      const orderId = validId(id) ? id : `RECORD-${String(index + 1).padStart(3, '0')}`;
      const issues = [];
      if (!validId(id)) issues.push(issue('invalid_id', 'Provide an order ID using letters, numbers, hyphens or underscores (up to 64 characters).'));
      if ((counts.get(id) || 0) > 1) issues.push(issue('duplicate_id', 'Resolve duplicate order IDs before creating a handoff.'));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(order.contactEmail))) {
        issues.push(issue('contact_required', 'Check the contact email. This demo does not verify delivery.'));
      }
      const items = order.items;
      if (!Array.isArray(items) || items.length === 0 || items.some(item =>
        !item || !text(item.sku) || !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
        issues.push(issue('items_invalid', 'Provide at least one item with a SKU and a positive whole-number quantity.'));
      }
      if (!['delivery', 'pickup'].includes(order.fulfilment)) {
        issues.push(issue('fulfilment_required', 'Choose delivery or pickup.'));
      } else if (order.fulfilment === 'delivery' && !text(order.city)) {
        issues.push(issue('city_required', 'Provide a delivery city.'));
      }
      if (!['paid', 'pending'].includes(order.paymentStatus)) {
        issues.push(issue('payment_status_invalid', 'Confirm whether the payment status is paid or pending.'));
      }
      if (order.paymentStatus === 'paid' && !text(order.paymentReference)) {
        issues.push(issue('payment_reference_required', 'Provide a reference for the recorded payment.'));
      }
      const state = issues.length ? 'review_required' : order.paymentStatus === 'pending' ? 'awaiting_payment' : 'ready_for_handoff';
      const actions = issues.length ? issues.map(item => ({ code: item.code, title: item.message })) :
        state === 'awaiting_payment' ? [{ code: 'check_payment', title: 'Confirm payment in the source system before fulfilment.' }] :
          [{ code: 'prepare_handoff', title: order.fulfilment === 'pickup' ? 'Prepare a pickup handoff for human review.' : 'Prepare a delivery handoff for human review.' }];
      return { record: index + 1, orderId, state, issues, actions };
    });
    const summary = { total: results.length, ready: 0, review: 0, waiting: 0 };
    for (const result of results) {
      summary[result.state === 'ready_for_handoff' ? 'ready' : result.state === 'review_required' ? 'review' : 'waiting']++;
    }
    return { schemaVersion: 1, mode: 'synthetic-demo', summary, orders: results };
  }
  return Object.freeze({ processOrders });
});
