from django.urls import path
from . import views

urlpatterns = [
    path("users", views.get_users, name="get_users"),
    path("users/add", views.add_user, name="add_user"),
    path("users/update", views.update_user, name="update_user"),
    path("users/delete", views.delete_user, name="delete_user"),
]
