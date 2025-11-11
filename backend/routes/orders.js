router.post('/', async (req, res) => {
  try {
    const data = req.body;

    // Support des deux formats : { customer: {...} } OU { clientName, phone, address }
    const customer = data.customer || {};
    const clientName = data.clientName || customer.name;
    const phone = data.phone || customer.phone;
    const email = data.email || customer.email;
    const address = data.address || customer.address;

    if (!clientName || !phone || !address) {
      return res.status(400).json({ message: 'Nom, téléphone et adresse sont requis.' });
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return res.status(400).json({ message: 'Aucun produit dans la commande.' });
    }

    // Vérifier le stock pour chaque produit avant de créer la commande
    for (const item of data.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Produit introuvable: ${item.name}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Stock insuffisant pour ${product.name}` });
      }
    }

    // Décrémente le stock
    for (const item of data.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
    }

    // Créer la commande
    const order = new Order({
      clientName,
      phone,
      email,
      address,
      items: data.items,
      total: data.total,
      date: data.date || new Date(),
      status: 'En attente',
    });

    const savedOrder = await order.save();

    res.status(201).json(savedOrder);

  } catch (err) {
    console.error('Erreur création commande:', err);
    res.status(500).json({ message: err.message });
  }
});
