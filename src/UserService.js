var UserService = (function () {
  function findByUserId(userId) {
    var users = SheetService.getRows('Users');
    for (var index = 0; index < users.length; index += 1) {
      if (String(users[index].user_id) === userId) {
        return users[index];
      }
    }
    return null;
  }

  function findOrCreate(userId) {
    var existingUser = findByUserId(userId);
    if (existingUser) {
      return existingUser;
    }
    var user = {
      user_id: userId,
      display_name: LineService.getDisplayName(userId),
      created_at: new Date(),
      is_active: true
    };
    SheetService.appendRow('Users', user);
    return user;
  }

  return { findByUserId: findByUserId, findOrCreate: findOrCreate };
}());
