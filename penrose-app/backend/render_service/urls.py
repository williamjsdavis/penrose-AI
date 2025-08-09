from django.urls import path
from .views import render_penrose

urlpatterns = [
    path("render/", render_penrose, name="render_penrose"),
]
