from django.urls import path
from .views import render_penrose, upload_image, generate_substance

urlpatterns = [
    path("render/", render_penrose, name="render_penrose"),
    path("upload-image/", upload_image, name="upload_image"),
    path("generate-substance/", generate_substance, name="generate_substance"),
]
